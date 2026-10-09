import type { z } from "zod";

/**
 * A chat client for any provider that speaks the OpenAI chat-completions
 * format. Baret uses two: Qwen (QwenCloud, Alibaba Cloud) for the agent
 * reviewer and KIMI (Moonshot) for plain-language explanations.
 *
 * `json` asks for a JSON object and checks it against a schema. `agent` lets
 * the model call tools for a few turns before it gives that object. A model's
 * answer is input like any other: when the provider cannot be reached, answers
 * with an error, or returns something the schema refuses, both throw
 * LlmUnavailableError and the caller decides what "no answer" means (the
 * reviewer vetoes, the explain route answers 503).
 */

export interface LlmProvider {
  name: string;
  baseUrl: string;
  model: string;
  /** Extra top-level fields sent with every request: a provider's own switches. */
  extraBody?: Readonly<Record<string, unknown>>;
  /** The name of the output cap field. Default "max_tokens". */
  tokenField?: "max_tokens" | "max_completion_tokens";
}

/**
 * Defaults for the two providers. Both can be overridden per deployment.
 * Checked with real calls on 2026-10-09: qwen3.8-max on QwenCloud (the
 * Alibaba host dashscope-intl.aliyuncs.com takes the same key) and kimi-k3 on
 * the Moonshot platform, each in JSON mode with the switches below.
 */
export const QWEN: LlmProvider = {
  name: "qwen",
  baseUrl: "https://maas.qwencloudapi.com/compatible-mode/v1",
  model: "qwen3.8-max",
  // qwen3.8-max thinks by default, and the API refuses JSON mode while it thinks.
  extraBody: { enable_thinking: false },
};

export const KIMI: LlmProvider = {
  name: "kimi",
  baseUrl: "https://api.moonshot.ai/v1",
  model: "kimi-k3",
  // kimi-k3 always reasons; its default effort ("max") is slow and can spend the
  // whole token budget before any visible text.
  extraBody: { reasoning_effort: "low" },
  tokenField: "max_completion_tokens",
};

export interface LlmClientOptions {
  provider: LlmProvider;
  apiKey: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export interface JsonRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** A function the model may call. `run` gets the parsed arguments; a throw is fed back to
 *  the model as {"error": message} and counts as a failed step, never as an answer. */
export interface LlmTool {
  /** /^[a-zA-Z0-9_-]{1,64}$/, the providers' rule for function names. */
  name: string;
  description: string;
  /** A JSON Schema object. */
  parameters: Record<string, unknown>;
  run(args: unknown, signal: AbortSignal): Promise<unknown>;
}

export type AgentStep =
  | {
      kind: "model";
      content: string | null;
      toolCalls: readonly { id: string; name: string; arguments: string }[];
    }
  | {
      kind: "tool";
      id: string;
      name: string;
      arguments: unknown;
      ok: boolean;
      result: unknown;
      ms: number;
    };

export interface AgentRequest<T> {
  system: string;
  user: string;
  /** Turns placed after the user message, e.g. a plan the model wrote earlier. */
  history?: readonly { role: "assistant" | "user"; content: string }[];
  tools: readonly LlmTool[];
  schema: z.ZodType<T>;
  /** Model turns before it is told to stop calling tools. Default 6. */
  maxSteps?: number;
  /** Per model turn. Default 800. */
  maxTokens?: number;
  /** For the whole loop, model turns and tools together. Default 90_000. */
  deadlineMs?: number;
  /** Per tool call. Default 10_000. */
  toolTimeoutMs?: number;
  /**
   * Tools the model must have run successfully before it answers. An answer
   * that comes first is sent back with a reminder, at most twice; after that
   * the answer stands and the caller judges it.
   */
  requiredTools?: readonly string[];
  signal?: AbortSignal;
  onStep?: (step: AgentStep) => void;
}

export interface AgentResult<T> {
  answer: T;
  steps: readonly AgentStep[];
}

/** The model gave no usable answer. */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LlmUnavailableError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** The first JSON object in a model's text; models sometimes wrap it in a code fence. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LlmUnavailableError("the model returned no JSON");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (cause) {
    throw new LlmUnavailableError("the model returned malformed JSON", null, { cause });
  }
}

const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_MAX_STEPS = 6;
const DEFAULT_DEADLINE_MS = 90_000;
const DEFAULT_TOOL_TIMEOUT_MS = 10_000;
/** A tool result longer than this is cut before it goes back to the model. */
const TOOL_RESULT_LIMIT = 6_000;

const REPAIR_PROMPT =
  "Answer now with the JSON object only, in the format the system message gives.";
const STOP_PROMPT =
  "Stop calling tools. Answer now with the JSON object only, in the format the system message gives.";
/** How many times an answer that skipped a required tool is sent back. */
const MAX_REMINDERS = 2;

type Message = Record<string, unknown>;
type ToolCall = { id: string; name: string; arguments: string };

/** The schema-checked object in a model's text, or undefined when there is none. */
function tryParse<T>(content: string, schema: z.ZodType<T>): { data: T } | undefined {
  let raw: unknown;
  try {
    raw = extractJson(content);
  } catch {
    return undefined;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { data: parsed.data } : undefined;
}

/** The calls in an assistant message, read defensively: a provider's shape is input too. */
function readToolCalls(message: Message): ToolCall[] {
  const calls = message.tool_calls;
  if (!Array.isArray(calls)) return [];
  return calls.map((call: unknown, index) => {
    const c = (call ?? {}) as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    const args = c.function?.arguments;
    return {
      id: typeof c.id === "string" ? c.id : `call_${index}`,
      name: typeof c.function?.name === "string" ? c.function.name : "",
      arguments: typeof args === "string" ? args : JSON.stringify(args ?? null),
    };
  });
}

/** A tool's arguments as an object, or undefined when they are not one. */
function parseArguments(text: string): Record<string, unknown> | undefined {
  // Some providers send "" for a call with no arguments.
  if (text.trim() === "") return {};
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Settles with `work`, or rejects once `signal` aborts, even if the tool ignores it. */
function within<T>(work: () => Promise<T>, signal: AbortSignal, name: string): Promise<T> {
  const late = () => new Error(`${name} did not finish in time`);
  if (signal.aborted) return Promise.reject(late());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(late());
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(work)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export class LlmClient {
  readonly provider: LlmProvider;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: LlmClientOptions) {
    if (!options.apiKey) throw new Error(`${options.provider.name}: an API key is required`);
    this.provider = options.provider;
    this.baseUrl = options.provider.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** One system and one user message in, one schema-checked JSON object out. */
  async json<T>(request: JsonRequest<T>): Promise<T> {
    const name = this.provider.name;
    const { message, status } = await this.complete(
      {
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: { type: "json_object" },
      },
      request.maxTokens ?? DEFAULT_MAX_TOKENS,
      request.signal,
    );
    const content = message.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new LlmUnavailableError(`${name} returned no message`, status);
    }

    const parsed = request.schema.safeParse(extractJson(content));
    if (!parsed.success) {
      throw new LlmUnavailableError(`${name} returned JSON off the expected shape`, status);
    }
    return parsed.data;
  }

  /**
   * Lets the model call tools for up to `maxSteps` turns, then takes one
   * schema-checked JSON object as its answer. Tool turns carry no
   * `response_format`, since some providers suppress tool calls in JSON mode.
   * A tool's failure goes back to the model as data; only the model's last
   * word is an answer, and a last word the schema refuses is no answer.
   */
  async agent<T>(request: AgentRequest<T>): Promise<AgentResult<T>> {
    const name = this.provider.name;
    const maxSteps = request.maxSteps ?? DEFAULT_MAX_STEPS;
    const maxTokens = request.maxTokens ?? DEFAULT_MAX_TOKENS;
    const toolTimeoutMs = request.toolTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
    const deadline = AbortSignal.timeout(request.deadlineMs ?? DEFAULT_DEADLINE_MS);
    const loop = request.signal ? AbortSignal.any([request.signal, deadline]) : deadline;

    const tools = new Map(request.tools.map((tool) => [tool.name, tool]));
    const toolSpecs = request.tools.map((tool) => ({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.parameters },
    }));
    const messages: Message[] = [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
      ...(request.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
    ];
    const steps: AgentStep[] = [];
    const succeeded = new Set<string>();
    const record = (step: AgentStep) => {
      steps.push(step);
      if (step.kind === "tool" && step.ok) succeeded.add(step.name);
      request.onStep?.(step);
    };
    let reminders = 0;

    /** One model turn: with the tools offered, or in JSON mode for a last word. */
    const turn = async (mode: "tools" | "json") => {
      const { message } = await this.complete(
        mode === "tools"
          ? { messages, tools: toolSpecs, tool_choice: "auto" }
          : { messages, response_format: { type: "json_object" } },
        maxTokens,
        loop,
      );
      const content = typeof message.content === "string" ? message.content : null;
      const toolCalls = mode === "tools" ? readToolCalls(message) : [];
      record({ kind: "model", content, toolCalls });
      return { message, content, toolCalls };
    };

    for (let step = 0; step < maxSteps; step++) {
      const { message, content, toolCalls } = await turn("tools");

      if (toolCalls.length === 0) {
        const missing = (request.requiredTools ?? []).filter((tool) => !succeeded.has(tool));
        if (missing.length > 0 && reminders < MAX_REMINDERS) {
          reminders++;
          messages.push(
            { role: "assistant", content: content ?? "" },
            {
              role: "user",
              content: `Before you answer, call these tools: ${missing.join(", ")}. Then answer with the JSON object only.`,
            },
          );
          continue;
        }
        if (content === null || content.trim() === "") {
          throw new LlmUnavailableError(`${name} returned no message`);
        }
        const answer = tryParse(content, request.schema);
        if (answer) return { answer: answer.data, steps };

        messages.push({ role: "assistant", content }, { role: "user", content: REPAIR_PROMPT });
        const repair = await turn("json");
        const repaired = repair.content ? tryParse(repair.content, request.schema) : undefined;
        if (!repaired) {
          throw new LlmUnavailableError(`${name} returned JSON off the expected shape`);
        }
        return { answer: repaired.data, steps };
      }

      // Sent back as the provider shaped it: some need their own fields (a
      // reasoning trace) echoed on the turn that asked for the tools.
      messages.push({ ...message, role: "assistant", content: content ?? "" });
      for (const call of toolCalls) {
        messages.push(await this.runTool(call, tools, toolTimeoutMs, loop, record));
      }
    }

    messages.push({ role: "user", content: STOP_PROMPT });
    const last = await turn("json");
    const answer = last.content ? tryParse(last.content, request.schema) : undefined;
    if (!answer) throw new LlmUnavailableError(`${name} did not finish`);
    return { answer: answer.data, steps };
  }

  /** Runs one call and returns the tool message for it; every failure becomes {"error"}. */
  private async runTool(
    call: ToolCall,
    tools: ReadonlyMap<string, LlmTool>,
    timeoutMs: number,
    loop: AbortSignal,
    record: (step: AgentStep) => void,
  ): Promise<Message> {
    const started = Date.now();
    const tool = tools.get(call.name);
    const args = parseArguments(call.arguments);
    let ok = false;
    let result: unknown;

    if (!tool) {
      result = { error: `there is no tool named "${call.name}"` };
    } else if (!args) {
      result = { error: "the arguments are not a JSON object" };
    } else {
      const signal = AbortSignal.any([loop, AbortSignal.timeout(timeoutMs)]);
      try {
        result = await within(() => tool.run(args, signal), signal, tool.name);
        ok = true;
      } catch (error) {
        result = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    let content: string;
    try {
      content = JSON.stringify(result ?? null);
    } catch {
      ok = false;
      result = { error: "the result could not be written as JSON" };
      content = JSON.stringify(result);
    }
    record({
      kind: "tool",
      id: call.id,
      name: call.name,
      arguments: args ?? call.arguments,
      ok,
      result,
      ms: Date.now() - started,
    });
    return { role: "tool", tool_call_id: call.id, content: content.slice(0, TOOL_RESULT_LIMIT) };
  }

  /** One POST to the chat-completions endpoint; returns the first choice's message. */
  private async complete(
    fields: Record<string, unknown>,
    maxTokens: number,
    signal?: AbortSignal,
  ): Promise<{ message: Message; status: number }> {
    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const callSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const name = this.provider.name;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        // The provider's switches go first so they can never replace a field Baret sets.
        body: JSON.stringify({
          ...this.provider.extraBody,
          model: this.provider.model,
          ...fields,
          [this.provider.tokenField ?? "max_tokens"]: maxTokens,
        }),
        signal: callSignal,
      });
    } catch (cause) {
      throw new LlmUnavailableError(`${name} did not answer`, null, { cause });
    }
    if (!res.ok) throw new LlmUnavailableError(`${name} answered ${res.status}`, res.status);

    let body: unknown;
    try {
      body = await res.json();
    } catch (cause) {
      throw new LlmUnavailableError(`${name} returned a body that is not JSON`, res.status, {
        cause,
      });
    }
    const message = (body as { choices?: { message?: unknown }[] } | null)?.choices?.[0]?.message;
    if (message === null || typeof message !== "object") {
      throw new LlmUnavailableError(`${name} returned no message`, res.status);
    }
    return { message: message as Message, status: res.status };
  }
}

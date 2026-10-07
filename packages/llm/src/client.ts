import type { z } from "zod";

/**
 * A chat client for any provider that speaks the OpenAI chat-completions
 * format. Baret uses two: Qwen (Alibaba Cloud Model Studio) for the agent
 * reviewer and KIMI (Moonshot) for plain-language explanations.
 *
 * The one call, `json`, asks for a JSON object and checks it against a schema.
 * A model's answer is input like any other: when the provider cannot be
 * reached, answers with an error, or returns something the schema refuses,
 * `json` throws LlmUnavailableError and the caller decides what "no answer"
 * means (the reviewer vetoes, the explain route answers 503).
 */

export interface LlmProvider {
  name: string;
  baseUrl: string;
  model: string;
}

/** Defaults for the two providers. Both can be overridden per deployment. */
export const QWEN: LlmProvider = {
  name: "qwen",
  baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  model: "qwen3.8-max",
};

export const KIMI: LlmProvider = {
  name: "kimi",
  baseUrl: "https://api.moonshot.ai/v1",
  model: "kimi-k3",
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
    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    const name = this.provider.name;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.provider.model,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
          response_format: { type: "json_object" },
          max_tokens: request.maxTokens ?? 800,
        }),
        signal,
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
    const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)
      ?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new LlmUnavailableError(`${name} returned no message`, res.status);
    }

    const parsed = request.schema.safeParse(extractJson(content));
    if (!parsed.success) {
      throw new LlmUnavailableError(`${name} returned JSON off the expected shape`, res.status);
    }
    return parsed.data;
  }
}

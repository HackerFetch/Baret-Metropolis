import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  analyzeRequestSchema,
  analyzeResponseSchema,
} from "./analyze.js";

/** Baret could not be reached or answered with something it should not. */
export class GuardUnreachableError extends Error {
  /**
   * What a non-2xx answer said: the parsed JSON (`{ error, message }` from
   * Baret's own server), the text when it is not JSON, null when there is none.
   * For reading and logging only. Whatever it says, the caller does not sign.
   */
  public readonly body: unknown;

  constructor(
    message: string,
    public readonly status: number | null = null,
    options?: { cause?: unknown; body?: unknown },
  ) {
    super(message, options);
    this.name = "GuardUnreachableError";
    this.body = options?.body ?? null;
  }
}

export interface TransactionGuardOptions {
  /** The Baret server, e.g. https://api.baret.example. No default on purpose. */
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

/**
 * Asks the Baret server for a verdict. It never signs or sends anything.
 *
 * Fail-closed: when the server cannot be reached, times out or returns a body
 * that does not match the contract, `evaluate` throws GuardUnreachableError.
 * The caller treats that as Blocked ("Can't reach Baret").
 */
export class TransactionGuard {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: TransactionGuardOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async evaluate(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const body = analyzeRequestSchema.parse(request);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers["x-api-key"] = this.options.apiKey;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/v1/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 15_000),
      });
    } catch (cause) {
      throw new GuardUnreachableError("Baret did not answer", null, { cause });
    }
    if (!res.ok) {
      throw new GuardUnreachableError(`Baret answered ${res.status}`, res.status, {
        body: await errorBody(res),
      });
    }
    const parsed = analyzeResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw new GuardUnreachableError("Baret answered with an unexpected body", res.status, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }
}

async function errorBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Whether a verdict lets the caller sign without asking anyone. */
export function isSafe(verdict: AnalyzeResponse): boolean {
  return verdict.decision === "safe";
}

/** Whether a verdict lets a person sign after reading the findings. */
export function isSignable(verdict: AnalyzeResponse): boolean {
  return verdict.decision !== "blocked";
}

/** Why a verdict may no longer be signed on. */
export type VerdictRefusal = "expired" | "wrong_chain";

/**
 * Whether a verdict can still be signed on: null when it can, the reason when
 * it cannot. `chainId` is the chain the caller is about to sign for.
 *
 * Call it right before signing, and again when a person took time to confirm.
 * Fail-closed: an `expiresAt` that is not a date reads as expired.
 */
export function verdictRefusal(
  verdict: AnalyzeResponse,
  expected: { chainId: number; now?: Date },
): VerdictRefusal | null {
  if (verdict.meta.chainId !== expected.chainId) return "wrong_chain";
  const expiresAt = Date.parse(verdict.expiresAt);
  const now = (expected.now ?? new Date()).getTime();
  if (!(now < expiresAt)) return "expired";
  return null;
}

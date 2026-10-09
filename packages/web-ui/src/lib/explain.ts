import { useEffect, useState } from "react";
import type { Verdict } from "./check-types.js";

/**
 * The client side of /v1/explain: KIMI's plain-words reading of a verdict.
 *
 * Every failure (no key on the server, a slow model, a bad answer) ends as
 * "unavailable", and the block then renders nothing, so the screen reads
 * exactly as it did before the model existed (D-028). The answer is checked
 * by hand: web-ui has no zod and no @baret/guard dependency.
 */

export type ExplainLanguage = "en" | "tr" | "zh";

export const EXPLAIN_LANGUAGES: readonly ExplainLanguage[] = ["en", "tr", "zh"];

/** Both apps reach the server at /api: the Vite proxy in dev, a Vercel rewrite in production. */
export const EXPLAIN_URL = "/api/v1/explain";

/** The server gives the model 28 s; past 32 s the block gives up quietly. */
const TIMEOUT_MS = 32_000;

export interface ExplainAnswer {
  decision: Verdict;
  explanation: {
    headline: string;
    summary: string;
    points: string[];
    advice: string;
  };
  language: ExplainLanguage;
  model: { provider: string; name: string };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length >= 1 && v.length <= max;

const isLanguage = (v: unknown): v is ExplainLanguage =>
  EXPLAIN_LANGUAGES.includes(v as ExplainLanguage);

/** The /v1/explain answer, or null for anything that is not exactly it. */
export function parseExplainAnswer(body: unknown): ExplainAnswer | null {
  if (!isObject(body)) return null;
  const { decision, explanation: e, language, model } = body;
  if (decision !== "safe" && decision !== "caution" && decision !== "blocked") return null;
  if (!isLanguage(language) || !isObject(e) || !isObject(model)) return null;
  if (!text(e.headline, 160) || !text(e.summary, 900) || !text(e.advice, 320)) return null;
  const { points } = e;
  if (!Array.isArray(points) || points.length > 8 || !points.every((p) => text(p, 320))) {
    return null;
  }
  if (typeof model.provider !== "string" || typeof model.name !== "string") return null;
  return {
    decision,
    explanation: {
      headline: e.headline,
      summary: e.summary,
      points: [...points],
      advice: e.advice,
    },
    language,
    model: { provider: model.provider, name: model.name },
  };
}

/** Asks the server once. Non-2xx, a bad body or a network error is null; never throws. */
export async function fetchExplanation(
  requestId: string,
  language: ExplainLanguage,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ExplainAnswer | null> {
  try {
    const res = await fetchImpl(EXPLAIN_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, language }),
      signal: signal ?? null,
    });
    if (!res.ok) return null;
    return parseExplainAnswer(await res.json());
  } catch {
    return null;
  }
}

/** The reader's language when it is one KIMI writes, else English. SSR-safe. */
export function defaultLanguage(
  tag: string | undefined = typeof navigator === "undefined" ? undefined : navigator.language,
): ExplainLanguage {
  const t = (tag ?? "").toLowerCase();
  if (t.startsWith("tr")) return "tr";
  if (t.startsWith("zh")) return "zh";
  return "en";
}

export type ExplainState =
  | { status: "loading"; answer: null }
  | { status: "unavailable"; answer: null }
  | { status: "ready"; answer: ExplainAnswer };

/** Settled answers per requestId and language, so switching back never asks twice. */
const cache = new Map<string, ExplainAnswer | null>();

const key = (requestId: string, language: ExplainLanguage) => `${requestId}\u0000${language}`;

/** Test hook: forget every settled answer. */
export function clearExplainCache(): void {
  cache.clear();
}

function settled(requestId: string | null, language: ExplainLanguage): ExplainState | null {
  if (requestId === null) return { status: "unavailable", answer: null };
  const k = key(requestId, language);
  if (!cache.has(k)) return null;
  const answer = cache.get(k) ?? null;
  return answer ? { status: "ready", answer } : { status: "unavailable", answer: null };
}

/**
 * KIMI's reading of one verdict in one language. Aborts on a change of
 * request or language and on unmount; a null requestId is unavailable.
 */
export function useExplanation(requestId: string | null, language: ExplainLanguage): ExplainState {
  const [state, setState] = useState<{ k: string; value: ExplainState } | null>(null);
  const k = requestId === null ? "" : key(requestId, language);

  useEffect(() => {
    if (requestId === null || cache.has(key(requestId, language))) return;
    const controller = new AbortController();
    // The timeout aborts too, and that settles as unavailable. An abort from a
    // change or unmount sets `cancelled` first, so it settles nothing.
    let cancelled = false;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    void fetchExplanation(requestId, language, controller.signal).then((answer) => {
      clearTimeout(timer);
      if (cancelled) return;
      const k = key(requestId, language);
      cache.set(k, answer);
      setState({
        k,
        value: answer ? { status: "ready", answer } : { status: "unavailable", answer: null },
      });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestId, language]);

  return (
    settled(requestId, language) ??
    (state && state.k === k ? state.value : { status: "loading", answer: null })
  );
}

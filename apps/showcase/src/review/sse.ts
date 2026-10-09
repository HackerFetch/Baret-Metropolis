/**
 * A small server-sent events reader for POST /v1/review.
 *
 * EventSource only speaks GET, so the page reads the stream with fetch and a
 * ReadableStream and parses the lines itself. The parser follows the parts of
 * the SSE format the server uses: `event:` and `data:` fields, multi-line
 * data joined with "\n", comment lines starting with ":", and a blank line
 * ending an event. Chunks may split anywhere, mid-line included, and may use
 * "\r\n" line ends.
 */

export interface SseEvent {
  readonly event: string;
  readonly data: string;
}

/** Feeds text chunks in; hands back each complete event. */
export class SseParser {
  #buffer = "";
  #event = "";
  #data: string[] = [];

  push(chunk: string): SseEvent[] {
    this.#buffer += chunk;
    const out: SseEvent[] = [];
    let newline = this.#buffer.search(/\r\n|\r|\n/);
    while (newline !== -1) {
      // A lone "\r" at the very end may be the first half of "\r\n": wait for more.
      if (this.#buffer[newline] === "\r" && newline === this.#buffer.length - 1) break;
      const line = this.#buffer.slice(0, newline);
      const width = this.#buffer.startsWith("\r\n", newline) ? 2 : 1;
      this.#buffer = this.#buffer.slice(newline + width);
      const event = this.#line(line);
      if (event) out.push(event);
      newline = this.#buffer.search(/\r\n|\r|\n/);
    }
    return out;
  }

  /** The stream ended: an event still waiting for its blank line is dispatched. */
  end(): SseEvent[] {
    const rest = this.#buffer;
    this.#buffer = "";
    const out: SseEvent[] = [];
    if (rest !== "") {
      const event = this.#line(rest);
      if (event) out.push(event);
    }
    const last = this.#line("");
    if (last) out.push(last);
    return out;
  }

  #line(line: string): SseEvent | null {
    if (line === "") {
      if (this.#data.length === 0) {
        this.#event = "";
        return null;
      }
      const event = { event: this.#event || "message", data: this.#data.join("\n") };
      this.#event = "";
      this.#data = [];
      return event;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") this.#event = value;
    else if (field === "data") this.#data.push(value);
    return null;
  }
}

/** Reads a response body to the end, calling `onEvent` for each event in order. */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of parser.push(decoder.decode(value, { stream: true }))) onEvent(event);
    }
    for (const event of parser.push(decoder.decode())) onEvent(event);
    for (const event of parser.end()) onEvent(event);
  } finally {
    reader.releaseLock();
  }
}

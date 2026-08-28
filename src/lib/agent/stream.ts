import type { AgentMode, AgentReply, ToolRun } from "./types";

/**
 * The wire format between `/api/agent` and the two clients that read it.
 *
 * Newline-delimited JSON rather than the AI SDK's UI-message protocol: the
 * workspace keeps its own conversation state and only needs four things —
 * which tool is running, its result, the answer as it arrives, and the
 * sources. A hand-rolled union keeps that explicit and keeps the deterministic
 * keyless path on exactly the same channel as the model-driven one.
 */
export type AgentEvent =
  /** A tool call has started. Emitted before the request goes out. */
  | { type: "tool-start"; id: string; name: string; label: string; input: unknown }
  /** That tool call finished. Replaces the pending entry with the same id. */
  | { type: "tool"; run: ToolRun }
  | { type: "text"; delta: string }
  | { type: "sources"; sources: AgentReply["sources"] }
  | { type: "done"; mode: AgentMode }
  | { type: "error"; message: string };

export type PendingTool = {
  id: string;
  name: string;
  label: string;
  input: unknown;
};

const eventEncoder = new TextEncoder();

/** Wraps a producer into an NDJSON `ReadableStream`. */
export function agentEventStream(
  produce: (emit: (event: AgentEvent) => void) => Promise<void>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      let closed = false;
      const emit = (event: AgentEvent) => {
        if (closed) return;
        controller.enqueue(eventEncoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await produce(emit);
      } catch (cause) {
        console.error("Agent stream failed", cause);
        emit({
          message: "Ani couldn't finish that research pass. Try again in a moment.",
          type: "error",
        });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });
}

export function agentStreamResponse(
  stream: ReadableStream<Uint8Array>,
  extraHeaders: HeadersInit = {},
) {
  const headers = new Headers({
    "Cache-Control": "no-store, no-transform",
    "Content-Type": "application/x-ndjson; charset=utf-8",
    // Proxies that buffer would defeat the whole point of streaming.
    "X-Accel-Buffering": "no",
  });
  for (const [name, value] of new Headers(extraHeaders)) {
    headers.append(name, value);
  }

  return new Response(stream, {
    headers,
  });
}

/**
 * Reads the NDJSON stream on the client, handing each event to `onEvent`.
 * Partial lines are held until their newline arrives, so an event split across
 * two network chunks is never parsed as truncated JSON.
 */
export async function readAgentStream(
  response: Response,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error("The agent returned no response body.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as AgentEvent);
        } catch {
          // A malformed line is not worth tearing the whole answer down for.
        }
      }
      newline = buffer.indexOf("\n");
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    flush(decoder.decode(value, { stream: true }));
  }
  flush(decoder.decode());
  if (buffer.trim()) flush("\n");
}

/**
 * Splits streamed text into speakable sentences.
 *
 * Feed it deltas; it returns whole sentences as they complete and keeps the
 * tail until more arrives. This is what lets Ani start talking on sentence one
 * instead of waiting for the last token — the thing that makes her feel present
 * rather than like a form that posts back.
 */
export class SentenceSplitter {
  private buffer = "";

  push(delta: string): string[] {
    this.buffer += delta;
    const sentences: string[] = [];
    // A terminator followed by whitespace, so "$0.0000284." mid-number and
    // "pump.fun" do not get treated as the end of a thought.
    const pattern = /[^.!?…]*[.!?…]+(?=\s)/g;
    let consumed = 0;
    for (const match of this.buffer.matchAll(pattern)) {
      const sentence = match[0].trim();
      if (sentence.length > 1) sentences.push(sentence);
      consumed = (match.index ?? 0) + match[0].length;
    }
    if (consumed > 0) this.buffer = this.buffer.slice(consumed);
    return sentences;
  }

  /** Whatever is left when the stream ends. */
  flush(): string | null {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest.length > 1 ? rest : null;
  }
}

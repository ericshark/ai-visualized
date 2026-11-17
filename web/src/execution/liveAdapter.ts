import type { ExecutionAdapter } from "./adapter";
import {
  EVENT_STAGE,
  stamp,
  type EventType,
  type Payloads,
  type UnstampedEvent,
} from "./events";
import { createSseParser } from "./sse";

export const STREAM_PATH = "/api/chat/stream";

const KNOWN: EventType[] = [
  "backend.received",
  "backend.validated",
  "input.tokens",
  "provider.request",
  "output.delta",
  "output.done",
  "error",
];

interface Options {
  baseUrl: string;
  fetch?: typeof fetch;
  now?: () => number;
}

/**
 * Sends a real request to the FastAPI backend and turns its SSE stream into
 * run events. Times are measured in the browser, from the moment of Send.
 */
export function createLiveAdapter({
  baseUrl,
  fetch: fetchImpl = (...args) => globalThis.fetch(...args),
  now = () => performance.now(),
}: Options): ExecutionAdapter {
  return {
    start({ runId, prompt }, onEvent) {
      const controller = new AbortController();
      const startedAt = now();
      let finished = false;
      const elapsed = () => Math.round(now() - startedAt);

      const emit = (raw: UnstampedEvent) => {
        if (finished) return;
        if (raw.type === "output.done" || raw.type === "error" || raw.type === "cancelled") {
          finished = true;
        }
        onEvent(stamp(raw, runId, "observed"));
      };

      const fail = (message: string, code: string, retryable = true) =>
        emit({ type: "error", t: elapsed(), stage: "return", payload: { message, code, retryable } });

      const url = `${baseUrl}${STREAM_PATH}`;
      const body = { prompt };
      const bodyText = JSON.stringify(body);
      const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };

      emit({
        type: "request.created",
        t: 0,
        stage: "send",
        payload: {
          method: "POST",
          url: STREAM_PATH,
          headers,
          body,
          bytes: new TextEncoder().encode(bodyText).length,
        },
      });

      (async () => {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: "POST",
            headers,
            body: bodyText,
            signal: controller.signal,
          });
        } catch {
          if (!controller.signal.aborted) {
            fail("The app server could not be reached. Check that the backend is running.", "network");
          }
          return;
        }

        if (!response.ok || !response.body) {
          fail(await errorMessage(response), `http_${response.status}`, response.status >= 500 || response.status === 429);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parse = createSseParser();

        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            for (const frame of parse(decoder.decode(value, { stream: true }))) {
              const type = frame.event as EventType;
              if (!KNOWN.includes(type)) continue;
              let data: { payload?: unknown };
              try {
                data = JSON.parse(frame.data);
              } catch {
                continue;
              }
              emit({
                type,
                t: elapsed(),
                stage: EVENT_STAGE[type],
                payload: data.payload as Payloads[typeof type],
              } as UnstampedEvent);
            }
          }
          if (!finished && !controller.signal.aborted) {
            fail("The response stopped before it was complete.", "incomplete");
          }
        } catch {
          if (!controller.signal.aborted) {
            fail("The connection dropped while the answer was streaming.", "stream");
          }
        }
      })();

      return () => {
        if (finished) return;
        controller.abort();
        emit({ type: "cancelled", t: elapsed(), stage: "return", payload: {} });
      };
    },
  };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return String(data.detail[0].msg);
  } catch {
    // fall through
  }
  if (response.status === 429) return "Too many requests. Wait a minute and try again.";
  return `The app server answered with an error (${response.status}).`;
}

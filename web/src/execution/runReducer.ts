import type {
  AnyRunEvent,
  OutputToken,
  Payloads,
} from "./events";

export type RunStatus = "idle" | "running" | "done" | "error" | "cancelled";

export interface Chunk {
  /** Sample milliseconds from the start of the run */
  t: number;
  text: string;
  tokens?: OutputToken[];
}

export interface RunState {
  runId: string | null;
  status: RunStatus;
  prompt: string;
  events: AnyRunEvent[];
  request?: Payloads["request.created"];
  received?: Payloads["backend.received"];
  validated?: Payloads["backend.validated"];
  inputTokens?: Payloads["input.tokens"];
  provider?: Payloads["provider.request"];
  chunks: Chunk[];
  text: string;
  done?: Payloads["output.done"];
  error?: Payloads["error"];
  /** Sample time of the first output chunk. */
  firstChunkMs?: number;
  /** Sample time the answer finished. */
  totalMs?: number;
}

export type RunAction =
  | { type: "start"; runId: string; prompt: string }
  | { type: "event"; event: AnyRunEvent }
  | { type: "reset" };

export const initialRun: RunState = {
  runId: null,
  status: "idle",
  prompt: "",
  events: [],
  chunks: [],
  text: "",
};

const TERMINAL: RunStatus[] = ["done", "error", "cancelled"];

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "reset":
      return initialRun;
    case "start":
      return {
        ...initialRun,
        runId: action.runId,
        status: "running",
        prompt: action.prompt,
      };
    case "event":
      return applyEvent(state, action.event);
  }
}

function applyEvent(state: RunState, event: AnyRunEvent): RunState {
  // Events from a superseded run (for example after a resubmit) are ignored.
  if (event.runId !== state.runId) return state;
  // Nothing changes a run after it has finished, failed or been cancelled.
  if (TERMINAL.includes(state.status)) return state;

  const next: RunState = { ...state, events: [...state.events, event] };

  switch (event.type) {
    case "request.created":
      return { ...next, request: event.payload };
    case "backend.received":
      return { ...next, received: event.payload };
    case "backend.validated":
      return { ...next, validated: event.payload };
    case "input.tokens":
      return { ...next, inputTokens: event.payload };
    case "provider.request":
      return { ...next, provider: event.payload };
    case "output.delta": {
      if (!event.payload.text) return next;
      return {
        ...next,
        chunks: [
          ...state.chunks,
          { t: event.t, text: event.payload.text, tokens: event.payload.tokens },
        ],
        text: state.text + event.payload.text,
        firstChunkMs: state.firstChunkMs ?? event.t,
      };
    }
    case "output.done":
      return {
        ...next,
        status: "done",
        done: event.payload,
        // The final text is authoritative if a chunk was lost or merged.
        text: event.payload.text || state.text,
        totalMs: event.t,
      };
    case "error":
      return { ...next, status: "error", error: event.payload };
    case "cancelled":
      return { ...next, status: "cancelled" };
  }
}

/** All output tokens of a run, in order, when the chunks carried them. */
export function outputTokens(run: RunState): OutputToken[] {
  return run.chunks.flatMap((c) => c.tokens ?? []);
}

export function isSettled(run: RunState): boolean {
  return TERMINAL.includes(run.status);
}

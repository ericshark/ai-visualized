import type { AnyRunEvent } from "./events";

export interface RunRequest {
  runId: string;
  prompt: string;
  /** Which recorded example to play, in demo mode. */
  exampleId?: string;
}

/**
 * A source of run events. `start` begins the run and returns a function that
 * cancels it. After cancellation the adapter emits at most one `cancelled`
 * event and nothing else.
 */
export interface ExecutionAdapter {
  start(request: RunRequest, onEvent: (event: AnyRunEvent) => void): () => void;
}

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const browserScheduler: Scheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) =>
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

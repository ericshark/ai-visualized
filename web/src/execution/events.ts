/**
 * The normalized event model. Every fact the lesson shows about a run arrives
 * as one of these events, whether it was recorded (demo), measured in this
 * run (observed), or is a teaching simulation (conceptual).
 */

export type Source = "demo" | "observed" | "conceptual";

export type StageId =
  | "send"
  | "backend"
  | "provider"
  | "tokens"
  | "model"
  | "generate"
  | "return"
  | "recap";

export type Mode = "demo" | "live";

export interface Token {
  text: string;
  /** Token ID from the tokenizer, when known. */
  id?: number;
}

export interface Candidate {
  token: string;
  /** Probability between 0 and 1. */
  p: number;
}

export interface OutputToken extends Token {
  /** Probability the model gave the token it produced, when known. */
  p?: number;
  /** The most likely alternatives at this step, when known. */
  top?: Candidate[];
}

export interface Check {
  id: string;
  label: string;
  ok: boolean;
}

export interface Payloads {
  "request.created": {
    method: "POST";
    url: string;
    headers: Record<string, string>;
    body: { prompt: string };
    bytes: number;
  };
  "backend.received": { endpoint: string; method: string };
  "backend.validated": { checks: Check[]; promptChars: number };
  "input.tokens": {
    tokens: Token[];
    encoding: string;
    /** True when the tokenizer is the one the model actually uses. */
    exact: boolean;
  };
  "provider.request": {
    provider: string;
    model: string;
    settings: Record<string, string | number | boolean>;
    instructions: string;
    /** Allowlisted, secret-free preview of the provider payload. */
    preview: Record<string, unknown>;
  };
  "output.delta": {
    text: string;
    /** Tokens in this network chunk, when the backend could tell. */
    tokens?: OutputToken[];
  };
  "output.done": {
    text: string;
    usage?: { inputTokens: number; outputTokens: number } | null;
    finishReason?: string | null;
    /** True when the probabilities in output tokens came from the model. */
    probabilitiesMeasured: boolean;
    /** Where output token boundaries came from. */
    tokenSource?: "model" | "tokenizer";
    /** Times measured on the server, in ms since it received the request. */
    serverMs?: { firstToken?: number | null; total?: number | null };
  };
  error: { message: string; code: string; retryable: boolean };
  cancelled: Record<string, never>;
}

export type EventType = keyof Payloads;

export interface RunEvent<T extends EventType = EventType> {
  id: string;
  runId: string;
  type: T;
  /** Milliseconds since the run started, as seen by the browser. */
  t: number;
  stage: StageId;
  source: Source;
  payload: Payloads[T];
}

export type AnyRunEvent = { [K in EventType]: RunEvent<K> }[EventType];

/** Event as stored in a fixture or sent by the server: no run identity yet. */
export type UnstampedEvent = {
  [K in EventType]: { type: K; t: number; stage: StageId; payload: Payloads[K] };
}[EventType];

export const EVENT_STAGE: Record<EventType, StageId> = {
  "request.created": "send",
  "backend.received": "backend",
  "backend.validated": "backend",
  "input.tokens": "tokens",
  "provider.request": "provider",
  "output.delta": "return",
  "output.done": "return",
  error: "return",
  cancelled: "return",
};

let counter = 0;

export function stamp(
  raw: UnstampedEvent,
  runId: string,
  source: Source,
): AnyRunEvent {
  counter += 1;
  return { ...raw, id: `${runId}:${counter}`, runId, source } as AnyRunEvent;
}

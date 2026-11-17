import type { Candidate, OutputToken } from "@/execution/events";
import { outputTokens, type RunState } from "@/execution/runReducer";
import type { Beat } from "@/player/timeline";

export const STEP_MS = 1800;

export interface GenerationPlan {
  tokens: OutputToken[];
  /** How many tokens are shown one by one, with their candidates. */
  slow: number;
  /** True when the first steps came with next-token alternatives. */
  hasCandidates: boolean;
  /** True when those alternatives were measured from the model in this run. */
  measured: boolean;
}

export function generationPlan(run: RunState): GenerationPlan {
  const tokens = outputTokens(run);
  let leading = 0;
  while (leading < tokens.length && tokens[leading].top?.length) leading += 1;
  const hasCandidates = leading > 0;
  const slow = Math.min(tokens.length, hasCandidates ? Math.min(5, leading) : 3);
  return {
    tokens,
    slow,
    hasCandidates,
    measured: run.mode === "live" && !!run.done?.probabilitiesMeasured && hasCandidates,
  };
}

export function generateBeats(run: RunState): Beat[] {
  const { tokens, slow } = generationPlan(run);
  const rest = Math.max(0, tokens.length - slow);
  return [
    { id: "intro", duration: 1400 },
    ...Array.from({ length: slow }, (_, i) => ({ id: `step${i}`, duration: STEP_MS })),
    { id: "fast", duration: rest ? Math.min(3800, Math.max(1400, rest * 45)) : 0 },
    { id: "chunks", duration: 4000 },
  ];
}

/** Candidates for one step, sorted, always including the token that was chosen. */
export function candidatesFor(token: OutputToken): Candidate[] {
  const top = [...(token.top ?? [])].sort((a, b) => b.p - a.p).slice(0, 5);
  if (!top.length) return [];
  if (!top.some((c) => c.token === token.text) && token.p !== undefined) {
    top.splice(top.length - 1, 1, { token: token.text, p: token.p });
  }
  return top;
}

export function returnBeats(run: RunState): Beat[] {
  const first = run.firstChunkMs ?? 600;
  const total = run.totalMs ?? first + 1500;
  return [
    { id: "wait", duration: Math.max(250, first) },
    { id: "stream", duration: Math.max(800, total - first) },
    { id: "summary", duration: 3200 },
  ];
}

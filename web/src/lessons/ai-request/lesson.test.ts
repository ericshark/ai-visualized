import { describe, expect, it } from "vitest";
import { stamp } from "@/execution/events";
import { initialRun, runReducer, type RunState } from "@/execution/runReducer";
import { stageDuration } from "@/player/timeline";
import { EXAMPLES } from "./examples";
import { candidatesFor, generateBeats, generationPlan, returnBeats, STEP_MS } from "./generation";
import { aiRequestLesson } from "./lesson";

function finishedRun(index = 0): RunState {
  const example = EXAMPLES[index];
  let run = runReducer(initialRun, { type: "start", runId: "r", prompt: example.prompt });
  for (const raw of example.events) run = runReducer(run, { type: "event", event: stamp(raw, "r", "demo") });
  return run;
}

describe("sample runs", () => {
  it.each(EXAMPLES.map((e) => [e.id]))("%s plays through to a finished run", (id) => {
    const run = finishedRun(EXAMPLES.findIndex((e) => e.id === id));
    expect(run.status).toBe("done");
    expect(run.text.length).toBeGreaterThan(100);
    expect(run.chunks.length).toBeGreaterThan(5);
    expect(run.inputTokens?.tokens.length).toBeGreaterThan(3);
    expect(run.provider?.model).toBeTruthy();
    // chunks and tokens are different things: there are more tokens than chunks
    const tokens = run.chunks.flatMap((c) => c.tokens ?? []);
    expect(tokens.length).toBeGreaterThan(run.chunks.length);
    expect(tokens.map((t) => t.text).join("")).toBe(run.text);
  });
});

describe("ai-request lesson", () => {
  const run = finishedRun();

  it("has the eight stages in order", () => {
    expect(aiRequestLesson.stages.map((s) => s.id)).toEqual([
      "send",
      "backend",
      "provider",
      "tokens",
      "model",
      "generate",
      "return",
      "recap",
    ]);
  });

  it("answers what, why and what changes for every stage", () => {
    for (const stage of aiRequestLesson.stages) {
      expect(stage.simple.length, stage.id).toBeGreaterThan(20);
      expect(stage.why.length, stage.id).toBeGreaterThan(20);
      expect(stage.changes.length, stage.id).toBeGreaterThan(20);
    }
  });

  it("has beats, a rail and readiness for every stage once the run has finished", () => {
    for (const stage of aiRequestLesson.stages) {
      const beats = stage.beats(run);
      expect(stage.ready(run), stage.id).toBe(true);
      expect(stageDuration(beats), stage.id).toBeGreaterThan(1000);
      expect(new Set(beats.map((b) => b.id)).size, `${stage.id} beat ids are unique`).toBe(beats.length);
      const travel = stage.rail(run, beats).travel;
      if (travel) expect(beats.map((b) => b.id)).toContain(travel.beat);
    }
  });

  it("holds the data stages until the run has what they show", () => {
    const empty = runReducer(initialRun, { type: "start", runId: "r", prompt: "Hi" });
    const ready = Object.fromEntries(aiRequestLesson.stages.map((s) => [s.id, s.ready(empty)]));
    expect(ready).toMatchObject({ send: false, backend: false, provider: false, tokens: false, generate: false, return: false, recap: true });
  });

  it("builds technical detail from the run without throwing, never exposing the key", () => {
    const text = JSON.stringify(aiRequestLesson.stages.map((s) => s.deeper(run)));
    expect(text).toContain("redacted");
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
  });

  it("works for a run that has not produced anything yet", () => {
    const empty = runReducer(initialRun, { type: "start", runId: "r", prompt: "Hi" });
    for (const stage of aiRequestLesson.stages) {
      expect(() => stage.deeper(empty)).not.toThrow();
      expect(() => stage.beats(empty)).not.toThrow();
    }
  });
});

describe("generation plan", () => {
  it("shows the first few tokens one by one, with their alternatives", () => {
    const run = finishedRun();
    const plan = generationPlan(run);
    expect(plan.hasCandidates).toBe(true);
    expect(plan.slow).toBe(5);

    const beats = generateBeats(run);
    expect(beats.filter((b) => b.id.startsWith("step"))).toHaveLength(5);
    expect(beats.find((b) => b.id === "step0")?.duration).toBe(STEP_MS);
    expect(beats.at(-1)?.id).toBe("chunks");
  });

  it("does not claim probabilities when the model returned none", () => {
    const run = finishedRun();
    const stripped: RunState = {
      ...run,
      chunks: run.chunks.map((c) => ({ ...c, tokens: c.tokens?.map((t) => ({ text: t.text, id: t.id })) })),
    };
    const plan = generationPlan(stripped);
    expect(plan.hasCandidates).toBe(false);
    expect(plan.slow).toBe(3);
  });

  it("always includes the chosen token among the candidates", () => {
    const candidates = candidatesFor({
      text: " rare",
      p: 0.02,
      top: [
        { token: " a", p: 0.4 },
        { token: " b", p: 0.3 },
        { token: " c", p: 0.2 },
        { token: " d", p: 0.05 },
        { token: " e", p: 0.03 },
      ],
    });
    expect(candidates).toHaveLength(5);
    expect(candidates.map((c) => c.token)).toContain(" rare");
  });

  it("replays the return stage at the speed the chunks arrived", () => {
    const run = finishedRun();
    const [wait, stream] = returnBeats(run);
    expect(wait.duration).toBe(Math.max(250, run.firstChunkMs!));
    expect(wait.duration + stream.duration).toBeCloseTo(run.totalMs!, -1);
  });
});

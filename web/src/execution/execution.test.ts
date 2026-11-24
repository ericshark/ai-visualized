import { describe, expect, it } from "vitest";
import type { Scheduler } from "./adapter";
import { createDemoAdapter, type Fixture } from "./demoAdapter";
import { stamp, type AnyRunEvent, type UnstampedEvent } from "./events";
import { initialRun, isSettled, outputTokens, runReducer, type RunState } from "./runReducer";

const raw = {
  delta: (t: number, text: string): UnstampedEvent => ({
    type: "output.delta",
    t,
    stage: "return",
    payload: { text, tokens: [{ text, id: t }] },
  }),
  done: (t: number, text: string): UnstampedEvent => ({
    type: "output.done",
    t,
    stage: "return",
    payload: { text, probabilitiesMeasured: false },
  }),
};

function started(runId = "r1"): RunState {
  return runReducer(initialRun, { type: "start", runId, prompt: "Hi" });
}

const apply = (state: RunState, ...events: AnyRunEvent[]) =>
  events.reduce((s, event) => runReducer(s, { type: "event", event }), state);

describe("runReducer", () => {
  it("accumulates streamed chunks and timing", () => {
    const s = apply(
      started(),
      stamp(raw.delta(300, "Hello"), "r1", "demo"),
      stamp(raw.delta(340, " there"), "r1", "demo"),
      stamp(raw.done(500, "Hello there"), "r1", "demo"),
    );
    expect(s.text).toBe("Hello there");
    expect(s.chunks).toHaveLength(2);
    expect(s.firstChunkMs).toBe(300);
    expect(s.totalMs).toBe(500);
    expect(s.status).toBe("done");
    expect(outputTokens(s).map((t) => t.text)).toEqual(["Hello", " there"]);
  });

  it("ignores events from a superseded run", () => {
    const s = apply(started("new"), stamp(raw.delta(10, "stale"), "old", "demo"));
    expect(s.text).toBe("");
    expect(s.events).toHaveLength(0);
  });

  it("ignores events after the run has settled", () => {
    const s = apply(
      started(),
      stamp(raw.done(100, "Done"), "r1", "demo"),
      stamp(raw.delta(120, " late"), "r1", "demo"),
    );
    expect(s.text).toBe("Done");
  });

  it("records errors and cancellation as settled states", () => {
    const failed = apply(
      started(),
      stamp({ type: "error", t: 5, stage: "return", payload: { message: "x", code: "c", retryable: true } }, "r1", "demo"),
    );
    expect(failed.status).toBe("error");
    expect(isSettled(failed)).toBe(true);

    const cancelled = apply(started(), stamp({ type: "cancelled", t: 5, stage: "return", payload: {} }, "r1", "demo"));
    expect(cancelled.status).toBe("cancelled");
  });

});

function fakeScheduler() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 0;
  const scheduler: Scheduler = {
    setTimeout: (fn, ms) => {
      timers.push({ at: now + ms, fn, id: ++nextId });
      return nextId;
    },
    clearTimeout: (id) => {
      timers = timers.filter((t) => t.id !== id);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
    timers = timers.filter((t) => t.at > now);
    due.forEach((t) => t.fn());
  };
  return { scheduler, advance };
}

describe("createDemoAdapter", () => {
  const fixture: Fixture = {
    id: "ex",
    prompt: "Hi",
    events: [raw.delta(100, "Hel"), raw.delta(200, "lo"), raw.done(300, "Hello")],
  };

  it("plays a fixture at its recorded offsets", () => {
    const { scheduler, advance } = fakeScheduler();
    const seen: AnyRunEvent[] = [];
    createDemoAdapter([fixture], scheduler).start({ runId: "r1", prompt: "Hi", exampleId: "ex" }, (e) => seen.push(e));

    advance(150);
    expect(seen.map((e) => e.type)).toEqual(["output.delta"]);
    advance(200);
    expect(seen.map((e) => e.type)).toEqual(["output.delta", "output.delta", "output.done"]);
    expect(seen.every((e) => e.runId === "r1" && e.source === "demo")).toBe(true);
  });

  it("stops emitting after cancellation", () => {
    const { scheduler, advance } = fakeScheduler();
    const seen: AnyRunEvent[] = [];
    const cancel = createDemoAdapter([fixture], scheduler).start({ runId: "r1", prompt: "Hi" }, (e) => seen.push(e));
    advance(150);
    cancel();
    cancel();
    advance(1000);
    expect(seen.map((e) => e.type)).toEqual(["output.delta", "cancelled"]);
  });
});

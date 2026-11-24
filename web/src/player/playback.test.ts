import { describe, expect, it } from "vitest";
import { initialPlayback, playbackReducer, type PlaybackAction, type PlaybackState } from "./playback";
import { beatAt, beatStart, progressOf, stageDuration, type StageTiming } from "./timeline";

const timings: StageTiming[] = [
  { beats: [{ id: "a", duration: 1000 }, { id: "b", duration: 1000 }] },
  { beats: [{ id: "c", duration: 3000 }], gateAt: 2000 },
  { beats: [{ id: "d", duration: 500 }] },
];

function run(actions: PlaybackAction[], from: PlaybackState = initialPlayback) {
  return actions.reduce((s, a) => playbackReducer(s, a, timings), from);
}

const tick = (dt: number, gateOpen = true): PlaybackAction => ({ type: "tick", dt, gateOpen });

describe("timeline", () => {
  const beats = timings[0].beats;

  it("sums beat durations", () => {
    expect(stageDuration(beats)).toBe(2000);
  });

  it("finds the beat at a time", () => {
    expect(beatAt(beats, 0)).toEqual({ index: 0, id: "a", progress: 0 });
    expect(beatAt(beats, 1500)).toEqual({ index: 1, id: "b", progress: 0.5 });
    expect(beatAt(beats, 9999)).toEqual({ index: 1, id: "b", progress: 1 });
  });

  it("measures progress through a named beat", () => {
    expect(beatStart(beats, "b")).toBe(1000);
    expect(progressOf(beats, "b", 500)).toBe(0);
    expect(progressOf(beats, "b", 1250)).toBe(0.25);
    expect(progressOf(beats, "a", 5000)).toBe(1);
  });
});

describe("playbackReducer", () => {
  it("starts at the first stage, playing", () => {
    expect(run([{ type: "start" }])).toMatchObject({ stage: 0, elapsed: 0, status: "playing" });
  });

  it("advances time only while playing", () => {
    expect(run([{ type: "start" }, tick(400)]).elapsed).toBe(400);
    expect(run([{ type: "start" }, { type: "pause" }, tick(400)]).elapsed).toBe(0);
    expect(run([tick(400)]).status).toBe("idle");
  });

  it("resumes from where it paused", () => {
    const s = run([{ type: "start" }, tick(700), { type: "pause" }, tick(5000), { type: "play" }, tick(100)]);
    expect(s).toMatchObject({ stage: 0, elapsed: 800, status: "playing" });
  });

  it("moves to the next stage when a stage ends", () => {
    expect(run([{ type: "start" }, tick(2100)])).toMatchObject({ stage: 1, elapsed: 0 });
  });

  it("holds at a gate until the run settles", () => {
    const held = run([{ type: "start" }, { type: "goTo", stage: 1 }, { type: "play" }, tick(2500, false)]);
    expect(held).toMatchObject({ stage: 1, elapsed: 2000, waiting: true, status: "playing" });
    const released = playbackReducer(held, tick(500, true), timings);
    expect(released).toMatchObject({ elapsed: 2500, waiting: false });
  });

  it("finishes at the end of the last stage", () => {
    const s = run([{ type: "start" }, { type: "goTo", stage: 2 }, { type: "play" }, tick(600)]);
    expect(s).toMatchObject({ stage: 2, elapsed: 500, status: "finished" });
    expect(playbackReducer(s, tick(100), timings)).toBe(s);
  });

  it("navigates with next, back and goTo", () => {
    expect(run([{ type: "start" }, { type: "next" }]).stage).toBe(1);
    expect(run([{ type: "start" }, { type: "next" }, { type: "back" }]).stage).toBe(0);
    expect(run([{ type: "start" }, { type: "goTo", stage: 99 }]).stage).toBe(2);
    expect(run([{ type: "start" }, { type: "back" }]).stage).toBe(0);
  });

  it("holds a selected stage for inspection until the user plays it", () => {
    const inspected = run([{ type: "start" }, { type: "goTo", stage: 1 }, tick(9000)]);
    expect(inspected).toMatchObject({ stage: 1, status: "inspecting" });
    const stepped = playbackReducer(inspected, { type: "next" }, timings);
    expect(stepped).toMatchObject({ stage: 2, status: "inspecting" });
    expect(playbackReducer(stepped, { type: "back" }, timings)).toMatchObject({ stage: 1, status: "inspecting" });
    expect(playbackReducer(inspected, { type: "play" }, timings)).toMatchObject({ stage: 1, elapsed: 0, status: "playing" });
  });

  it("restarts the current stage on back when well into it", () => {
    const s = run([{ type: "start" }, { type: "next" }, tick(1800, true), { type: "back" }]);
    expect(s).toMatchObject({ stage: 1, elapsed: 0 });
  });

  it("finishes when next is pressed on the last stage", () => {
    const s = run([{ type: "start" }, { type: "goTo", stage: 2 }, { type: "next" }]);
    expect(s).toMatchObject({ stage: 2, status: "finished" });
  });

  it("replays from the start after finishing", () => {
    const s = run([{ type: "start" }, { type: "goTo", stage: 2 }, tick(600), { type: "start" }]);
    expect(s).toMatchObject({ stage: 0, elapsed: 0, status: "playing" });
  });

  it("toggles between playing and paused", () => {
    const paused = run([{ type: "start" }, { type: "toggle" }]);
    expect(paused.status).toBe("paused");
    expect(playbackReducer(paused, { type: "toggle" }, timings).status).toBe("playing");
  });

  describe("reduced motion", () => {
    const reduced = { ...initialPlayback, reduced: true };

    it("shows each stage's end state and does not autoplay", () => {
      const s = run([{ type: "start" }, tick(10_000)], reduced);
      expect(s).toMatchObject({ stage: 0, elapsed: 2000, status: "paused" });
    });

    it("steps forward on play", () => {
      expect(run([{ type: "start" }, { type: "play" }], reduced)).toMatchObject({ stage: 1, elapsed: 3000 });
    });

    it("jumps to the end state when turned on mid-stage", () => {
      const s = run([{ type: "start" }, tick(300), { type: "setReduced", reduced: true }]);
      expect(s).toMatchObject({ elapsed: 2000, status: "paused", reduced: true });
    });
  });
});

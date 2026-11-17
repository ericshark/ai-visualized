import { stageDuration, type StageTiming } from "./timeline";

export type PlaybackStatus = "idle" | "playing" | "paused" | "finished";

export interface PlaybackState {
  stage: number;
  /** Milliseconds into the current stage. */
  elapsed: number;
  status: PlaybackStatus;
  /** Reduced motion: stages show their end state, nothing autoplays. */
  reduced: boolean;
  /** True while playback holds at a gate, waiting for the run. */
  waiting: boolean;
}

export type PlaybackAction =
  | { type: "start" }
  | { type: "tick"; dt: number; gateOpen: boolean }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; stage: number }
  | { type: "setReduced"; reduced: boolean }
  | { type: "stop" };

export const initialPlayback: PlaybackState = {
  stage: 0,
  elapsed: 0,
  status: "idle",
  reduced: false,
  waiting: false,
};

/**
 * Pure stage controller. It knows stage timings, not stage content, so it can
 * drive any lesson.
 */
export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
  timings: StageTiming[],
): PlaybackState {
  const last = timings.length - 1;
  const durationOf = (i: number) => stageDuration(timings[i]?.beats ?? []);

  const enter = (stage: number): PlaybackState => {
    const s = clamp(stage, 0, last);
    if (state.reduced) {
      return { ...state, stage: s, elapsed: durationOf(s), status: "paused", waiting: false };
    }
    return { ...state, stage: s, elapsed: 0, status: "playing", waiting: false };
  };

  switch (action.type) {
    case "start":
      return enter(0);

    case "stop":
      return { ...initialPlayback, reduced: state.reduced };

    case "setReduced": {
      const next = { ...state, reduced: action.reduced };
      if (action.reduced && state.status !== "idle") {
        return { ...next, elapsed: durationOf(state.stage), status: "paused", waiting: false };
      }
      return next;
    }

    case "play": {
      if (state.status === "idle") return enter(0);
      if (state.status === "finished") return state;
      if (state.reduced) {
        // Without motion, "play" means move on to the next stage.
        return state.stage === last ? state : { ...enter(state.stage + 1) };
      }
      return { ...state, status: "playing" };
    }

    case "pause":
      return state.status === "playing" ? { ...state, status: "paused", waiting: false } : state;

    case "toggle":
      return playbackReducer(state, { type: state.status === "playing" ? "pause" : "play" }, timings);

    case "next":
      if (state.status === "idle") return enter(0);
      if (state.stage >= last) return { ...state, elapsed: durationOf(last), status: "finished" };
      return enter(state.stage + 1);

    case "back":
      if (state.status === "idle") return state;
      // Early in a stage, Back goes to the previous stage; later, it restarts this one.
      if (state.elapsed > 1500 && !state.reduced) return enter(state.stage);
      return enter(Math.max(0, state.stage - 1));

    case "goTo":
      return enter(action.stage);

    case "tick": {
      if (state.status !== "playing" || state.reduced) return state;
      const timing = timings[state.stage];
      const duration = durationOf(state.stage);
      let elapsed = state.elapsed + action.dt;

      if (!action.gateOpen && timing?.gateAt !== undefined && elapsed >= timing.gateAt) {
        return { ...state, elapsed: timing.gateAt, waiting: true };
      }
      if (elapsed < duration) return { ...state, elapsed, waiting: false };
      if (state.stage >= last) {
        return { ...state, elapsed: duration, status: "finished", waiting: false };
      }
      elapsed = 0;
      return { ...state, stage: state.stage + 1, elapsed, waiting: false };
    }
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

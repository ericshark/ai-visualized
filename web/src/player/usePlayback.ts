"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "motion/react";
import {
  initialPlayback,
  playbackReducer,
  type PlaybackAction,
  type PlaybackState,
} from "./playback";
import type { StageTiming } from "./timeline";

/**
 * Runs the pure stage controller against a clock. Coarse state (stage, status,
 * waiting) is React state; fine-grained time lives in a motion value so the
 * page does not re-render on every frame.
 */
export function usePlayback(timings: StageTiming[], gateFor: (stage: number) => boolean) {
  const [state, setState] = useState<PlaybackState>(initialPlayback);
  const stateRef = useRef<PlaybackState>(initialPlayback);
  const timingsRef = useRef(timings);
  const gateRef = useRef(gateFor);
  const elapsed = useMotionValue(0);

  useEffect(() => {
    timingsRef.current = timings;
    gateRef.current = gateFor;
  });

  const apply = useCallback(
    (action: PlaybackAction) => {
      const prev = stateRef.current;
      const next = playbackReducer(prev, action, timingsRef.current);
      if (next === prev) return;
      stateRef.current = next;
      elapsed.set(next.elapsed);
      if (
        prev.stage !== next.stage ||
        prev.status !== next.status ||
        prev.waiting !== next.waiting ||
        prev.reduced !== next.reduced
      ) {
        setState(next);
      }
    },
    [elapsed],
  );

  useEffect(() => {
    if (state.status !== "playing") return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // A long gap (hidden tab, debugger) should not skip ahead in the lesson.
      const dt = Math.min(now - last, 100);
      last = now;
      apply({ type: "tick", dt, gateOpen: gateRef.current(stateRef.current.stage) });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.status, apply]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => apply({ type: "setReduced", reduced: query.matches });
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [apply]);

  return {
    stage: state.stage,
    status: state.status,
    waiting: state.waiting,
    reduced: state.reduced,
    elapsed,
    start: useCallback(() => apply({ type: "start" }), [apply]),
    pause: useCallback(() => apply({ type: "pause" }), [apply]),
    stop: useCallback(() => apply({ type: "stop" }), [apply]),
    toggle: useCallback(() => apply({ type: "toggle" }), [apply]),
    next: useCallback(() => apply({ type: "next" }), [apply]),
    back: useCallback(() => apply({ type: "back" }), [apply]),
    goTo: useCallback((stage: number) => apply({ type: "goTo", stage }), [apply]),
  };
}

export type Playback = ReturnType<typeof usePlayback>;

"use client";

import { useState } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/** With reduced motion, every stage shows its finished state. */
export const END_OF_TIME = 1e9;

/**
 * Milliseconds into the current stage, as React state. Only the component that
 * calls this re-renders as time advances, so a visualization can be written as
 * a plain function of time: pausable, replayable and deterministic.
 */
export function useStageTime(elapsed: MotionValue<number>, reduced: boolean, step = 16) {
  const [ms, setMs] = useState(() => elapsed.get());
  useMotionValueEvent(elapsed, "change", (v) => {
    setMs((prev) => (Math.abs(v - prev) >= step || v < prev ? v : prev));
  });
  return reduced ? END_OF_TIME : ms;
}

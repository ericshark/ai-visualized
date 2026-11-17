"use client";

import type { MotionValue } from "motion/react";
import type { StageDefinition } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { stageDuration, type Beat } from "./timeline";
import { useStageTime } from "./useStageTime";

function Fill({ elapsed, reduced, beats }: { elapsed: MotionValue<number>; reduced: boolean; beats: Beat[] }) {
  const ms = useStageTime(elapsed, reduced);
  const total = stageDuration(beats) || 1;
  return (
    <span
      className="absolute inset-y-0 left-0 rounded-full bg-accent"
      style={{ width: `${Math.min(100, (ms / total) * 100)}%` }}
    />
  );
}

interface Props {
  stages: StageDefinition[];
  current: number;
  beats: Beat[];
  elapsed: MotionValue<number>;
  reduced: boolean;
  onSelect: (index: number) => void;
}

export function StageProgress({ stages, current, beats, elapsed, reduced, onSelect }: Props) {
  return (
    <nav aria-label="Lesson stages">
      <ol className="flex gap-1.5 sm:gap-2">
        {stages.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={stage.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`Stage ${i + 1}: ${stage.title}`}
                className="group flex w-full flex-col gap-2 rounded-md py-1 text-left"
              >
                <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-line-2/70 transition-colors group-hover:bg-line-2">
                  {done && <span className="absolute inset-0 rounded-full bg-accent/80" />}
                  {active && <Fill elapsed={elapsed} reduced={reduced} beats={beats} />}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-[13px] leading-none transition-colors sm:block",
                    active ? "font-medium text-ink" : "text-ink-3 group-hover:text-ink-2",
                  )}
                >
                  {stage.short}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-[13px] text-ink-2 sm:hidden">
        <span className="font-medium text-ink">
          {current + 1} of {stages.length}
        </span>{" "}
        {stages[current].short}
      </p>
    </nav>
  );
}

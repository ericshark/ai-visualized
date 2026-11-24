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
  idle: boolean;
  onSelect: (index: number) => void;
}

export function StageProgress({ stages, current, beats, elapsed, reduced, idle, onSelect }: Props) {
  return (
    <nav aria-label="Lesson stages">
      <ol className="grid grid-cols-4 overflow-hidden rounded-xl border border-line-2 bg-surface sm:grid-cols-8">
        {stages.map((stage, i) => {
          const done = !idle && i < current;
          const active = !idle && i === current;
          return (
            <li key={stage.id} className="min-w-0 border-line nth-[n+5]:border-t not-nth-[4n]:border-r sm:nth-[n+5]:border-t-0 sm:not-last:border-r">
              <button
                type="button"
                onClick={() => onSelect(i)}
                disabled={idle}
                aria-current={active ? "step" : undefined}
                aria-label={`Stage ${i + 1}: ${stage.title}`}
                className={cn(
                  "relative flex min-h-12 w-full items-center gap-1.5 px-2 text-left text-xs focus-visible:-outline-offset-3 sm:px-3",
                  active ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink-2 enabled:hover:bg-surface-2",
                )}
              >
                <span className="hidden font-mono text-[10px] tabular-nums text-ink-3 min-[360px]:inline">{String(i + 1).padStart(2, "0")}</span>
                <span>{stage.short}</span>
                {(done || active) && (
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5">
                    {done ? <span className="absolute inset-0 bg-accent-line" /> : <Fill elapsed={elapsed} reduced={reduced} beats={beats} />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

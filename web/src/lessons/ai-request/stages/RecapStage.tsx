"use client";

import { RotateCcw, SquarePen } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import type { StageProps } from "@/lessons/types";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { COPY, MENTAL_MODEL, TAKEAWAYS } from "../content";
import { StageFrame, easeInOut, easeOut, stagger } from "./shared";

export function RecapStage({ beats, elapsed, reduced, goTo, onReplay, onAskAnother }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const zoom = easeInOut(progressOf(beats, "zoom", ms));
  const summary = easeOut(progressOf(beats, "summary", ms));

  return (
    <StageFrame>
      <div className="flex flex-1 flex-col gap-6" style={{ transform: `scale(${1.04 - 0.04 * zoom})`, transformOrigin: "50% 0" }}>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {TAKEAWAYS.map((text, i) => {
            const t = easeOut(stagger(zoom, i, TAKEAWAYS.length, 2.2));
            return (
              <li key={text} style={{ opacity: t, transform: `translateY(${(1 - t) * 10}px)` }}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-accent-line hover:bg-accent-soft/40"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent-strong">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink-3 group-hover:text-accent-strong">{COPY[i].short}</span>
                    <span className="block text-[14.5px] leading-snug text-ink">{text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="rounded-xl border border-accent-line bg-accent-soft/50 p-5" style={{ opacity: summary, transform: `translateY(${(1 - summary) * 10}px)` }}>
          <p className="text-[18px] leading-snug font-medium text-balance text-ink sm:text-[20px]">{MENTAL_MODEL}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-2">
            <span className="flex items-center gap-2">
              <SourceBadge kind="demo" /> written for the lesson
            </span>
            <span className="flex items-center gap-2">
              <SourceBadge kind="observed" /> captured from a live request
            </span>
            <span className="flex items-center gap-2">
              <SourceBadge kind="conceptual" /> a picture of what cannot be seen
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" style={{ opacity: summary }}>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            <RotateCcw className="size-4" />
            Replay the journey
          </button>
          <button
            type="button"
            onClick={onAskAnother}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink-3 hover:bg-surface-2"
          >
            <SquarePen className="size-4" />
            Ask another question
          </button>
        </div>
      </div>
    </StageFrame>
  );
}

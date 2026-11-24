"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Tip } from "@/components/Tip";
import { cn } from "@/lib/utils";
import type { PlaybackStatus } from "./playback";

interface Props {
  status: PlaybackStatus;
  reduced: boolean;
  waitingFor: string | null;
  canBack: boolean;
  onBack: () => void;
  onToggle: () => void;
  onNext: () => void;
  onReplay: () => void;
}

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40";
const quiet = "border-line-2 bg-surface text-ink hover:border-ink-3 hover:bg-surface-2";

export function PlaybackControls({ status, reduced, waitingFor, canBack, onBack, onToggle, onNext, onReplay }: Props) {
  const finished = status === "finished";
  const playing = status === "playing";
  const inspecting = status === "inspecting";
  const playLabel = finished ? "Replay" : playing ? "Pause" : inspecting ? "Play from here" : "Resume";

  return (
    <div
      role="group"
      aria-label="Playback controls"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2"
    >
      <Tip content="Previous stage (←)">
        <button type="button" onClick={onBack} disabled={!canBack} className={cn(base, quiet)} aria-label="Back">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
      </Tip>

      {!reduced && (
        <Tip content={`${playLabel} (Space)`}>
          <button
            type="button"
            onClick={finished ? onReplay : onToggle}
            className={cn(base, "min-w-24 border-accent bg-accent text-white hover:bg-accent-strong")}
            aria-label={playLabel}
          >
            {finished ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span>{playLabel}</span>
          </button>
        </Tip>
      )}

      <Tip content="Next stage (→)">
        <button
          type="button"
          onClick={onNext}
          disabled={finished}
          className={cn(base, reduced ? "min-w-24 border-accent bg-accent text-white hover:bg-accent-strong" : quiet)}
          aria-label="Next"
        >
          <span>Next</span>
          <ChevronRight className="size-4" />
        </button>
      </Tip>

      {!finished && (
        <Tip content="Start the journey over (R)">
          <button type="button" onClick={onReplay} className={cn(base, quiet, "ml-auto")} aria-label="Replay from the start">
            <RotateCcw className="size-4" />
            <span className="hidden md:inline">Replay</span>
          </button>
        </Tip>
      )}

      {waitingFor && (
        <p role="status" className="ml-1 hidden min-w-0 items-center gap-2 truncate text-[13px] text-ink-2 md:flex">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-accent" />
          Waiting for {waitingFor}
        </p>
      )}
    </div>
  );
}

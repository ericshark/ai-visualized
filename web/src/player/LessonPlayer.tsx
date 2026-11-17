"use client";

import { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { RunState } from "@/execution/runReducer";
import { StageFrame } from "@/lessons/ai-request/stages/shared";
import type { Lesson } from "@/lessons/types";
import { Explanation } from "./Explanation";
import { JourneyRail } from "./JourneyRail";
import { PlaybackControls } from "./PlaybackControls";
import { StageNotice } from "./StageNotice";
import { StageProgress } from "./StageProgress";
import type { Playback } from "./usePlayback";

interface Props {
  lesson: Lesson;
  run: RunState;
  playback: Playback;
  deeperOpen: boolean;
  onDeeperChange: (open: boolean) => void;
  onSend: () => void;
  onReplay: () => void;
  onAskAnother: () => void;
  onRetry: () => void;
  onUseDemo: () => void;
}

export function LessonPlayer({
  lesson,
  run,
  playback,
  deeperOpen,
  onDeeperChange,
  onSend,
  onReplay,
  onAskAnother,
  onRetry,
  onUseDemo,
}: Props) {
  const reduce = useReducedMotion();
  const { stage: index, status, elapsed, reduced, waiting } = playback;
  const idle = status === "idle";
  const stage = lesson.stages[index];
  const beats = useMemo(() => stage.beats(run), [stage, run]);
  const ready = stage.ready(run);
  const failed = !ready && (run.status === "error" || run.status === "cancelled");

  const { next, back, toggle } = playback;
  useEffect(() => {
    if (idle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "r" || event.key === "R") onReplay();
      else if (event.key === " " && !target?.closest("button, a, summary, [role='button']")) {
        event.preventDefault();
        if (!reduced) toggle();
        else next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idle, next, back, toggle, onReplay, reduced]);

  const railSpec = idle ? { active: [] } : stage.rail(run, beats);

  let canvas;
  if (idle) {
    canvas = (
      <StageFrame className="items-center justify-center text-center">
        <p className="text-[18px] font-medium text-ink">Your journey starts here</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-snug text-ink-2">
          Pick a question above and press Send. The lesson follows it through all eight stages.
        </p>
        <button
          type="button"
          onClick={onSend}
          className="mt-5 inline-flex h-10 items-center rounded-lg border border-accent bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          Send the question above
        </button>
      </StageFrame>
    );
  } else if (failed) {
    canvas = (
      <StageNotice
        kind={run.status === "cancelled" ? "cancelled" : "error"}
        message={run.error?.message}
        onRetry={run.mode === "live" || run.status === "cancelled" ? onRetry : undefined}
        onUseDemo={run.mode === "live" ? onUseDemo : undefined}
      />
    );
  } else if (!ready) {
    canvas = <StageNotice kind="waiting" waitingFor={stage.waitingFor} />;
  } else {
    canvas = (
      <motion.div
        key={stage.id}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <stage.Visual
          run={run}
          beats={beats}
          elapsed={elapsed}
          reduced={reduced}
          goTo={playback.goTo}
          onReplay={onReplay}
          onAskAnother={onAskAnother}
        />
      </motion.div>
    );
  }

  return (
    <section id="journey" aria-label={lesson.title} className="scroll-mt-4 space-y-5">
      {!idle && (
        <StageProgress
          stages={lesson.stages}
          current={index}
          beats={beats}
          elapsed={elapsed}
          reduced={reduced}
          onSelect={playback.goTo}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <JourneyRail spec={railSpec} beats={beats} elapsed={elapsed} reduced={reduced} idle={idle} />
          {canvas}
        </div>

        <div className="lg:sticky lg:top-6">
          {idle ? (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6">
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">Eight stages, one question</h2>
              <ol className="mt-3 space-y-2">
                {lesson.stages.map((s, i) => (
                  <li key={s.id} className="flex gap-3 text-[14.5px] text-ink-2">
                    <span className="w-4 shrink-0 text-ink-3 tabular-nums">{i + 1}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <Explanation
              stage={stage}
              index={index}
              total={lesson.stages.length}
              run={run}
              open={deeperOpen}
              onOpenChange={onDeeperChange}
            />
          )}
        </div>
      </div>

      {!idle && (
        <div className="sticky bottom-4 z-30">
          <PlaybackControls
            status={status}
            reduced={reduced}
            waitingFor={waiting && !failed ? stage.waitingFor : null}
            canBack
            onBack={back}
            onToggle={toggle}
            onNext={next}
            onReplay={onReplay}
          />
        </div>
      )}
    </section>
  );
}

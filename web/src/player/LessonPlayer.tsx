"use client";

import { useEffect, useMemo } from "react";
import { ArrowDownLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { RunState } from "@/execution/runReducer";
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
  onReplay: () => void;
  onAskAnother: () => void;
}

export function LessonPlayer({
  lesson,
  run,
  playback,
  deeperOpen,
  onDeeperChange,
  onReplay,
  onAskAnother,
}: Props) {
  const reduce = useReducedMotion();
  const { stage: index, status, elapsed, reduced, waiting } = playback;
  const idle = status === "idle";
  const showFinal = reduced || status === "inspecting";
  const answerIndex = lesson.stages.findIndex(({ id }) => id === "return");
  const stage = lesson.stages[index];
  const beats = useMemo(() => stage.beats(run), [stage, run]);
  const ready = stage.ready(run);
  const failed = !ready && (run.status === "error" || run.status === "cancelled");

  const { next, back, toggle } = playback;
  useEffect(() => {
    if (idle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role=combobox], [role=listbox]")) return;
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "r" || event.key === "R") onReplay();
      else if (event.key === " " && !target?.closest("button, a, summary, [role='button']")) {
        event.preventDefault();
        if (reduced) next();
        else if (status === "finished") onReplay();
        else toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idle, next, back, toggle, onReplay, reduced, status]);

  const railSpec = idle ? { active: [] } : stage.rail(run, beats);

  let canvas = null;
  if (!idle && failed) {
    canvas = (
      <StageNotice
        kind={run.status === "cancelled" ? "cancelled" : "error"}
        message={run.error?.message}
      />
    );
  } else if (!idle && !ready) {
    canvas = <StageNotice kind="waiting" waitingFor={stage.waitingFor} />;
  } else if (!idle) {
    canvas = (
      <motion.div
        key={stage.id}
        initial={reduce || showFinal ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <stage.Visual
          run={run}
          beats={beats}
          elapsed={elapsed}
          reduced={showFinal}
          goTo={playback.goTo}
          onReplay={onReplay}
          onAskAnother={onAskAnother}
        />
      </motion.div>
    );
  }

  return (
    <section id="journey" aria-labelledby="request-map-heading" className="scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="request-map-heading" className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Request map
        </h2>
        {idle ? (
          <p className="text-sm text-ink-2">Four stops, from your browser and back</p>
        ) : answerIndex >= 0 && index !== answerIndex && (
          <button
            type="button"
            onClick={() => playback.goTo(answerIndex)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--return)] px-3 text-sm font-semibold text-[var(--return)] hover:bg-[var(--return-soft)]"
          >
            <ArrowDownLeft className="size-4" aria-hidden /> See the answer
          </button>
        )}
      </div>
      <JourneyRail spec={railSpec} beats={beats} elapsed={elapsed} reduced={showFinal} idle={idle} />
      <div className="mt-4">
        <StageProgress
          stages={lesson.stages}
          current={index}
          beats={beats}
          elapsed={elapsed}
          reduced={showFinal}
          idle={idle}
          onSelect={playback.goTo}
        />
      </div>

      {!idle && (
        <>
          <div className="my-4">
            <PlaybackControls
              status={status}
              reduced={reduced}
              waitingFor={waiting && !failed ? stage.waitingFor : null}
              canBack={index > 0}
              onBack={back}
              onToggle={toggle}
              onNext={next}
              onReplay={onReplay}
            />
          </div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(17rem,0.48fr)_minmax(0,1fr)] lg:items-start">
            <Explanation
              stage={stage}
              index={index}
              total={lesson.stages.length}
              run={run}
              open={deeperOpen}
              onOpenChange={onDeeperChange}
            />
            <div className="min-w-0">{canvas}</div>
          </div>
        </>
      )}
    </section>
  );
}

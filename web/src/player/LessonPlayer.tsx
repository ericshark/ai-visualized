"use client";

import { useEffect, useMemo } from "react";
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
  onRetry: () => void;
  onUseDemo: () => void;
}

export function LessonPlayer({
  lesson,
  run,
  playback,
  deeperOpen,
  onDeeperChange,
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

  let canvas = null;
  if (!idle && failed) {
    canvas = (
      <StageNotice
        kind={run.status === "cancelled" ? "cancelled" : "error"}
        message={run.error?.message}
        onRetry={run.error?.retryable || run.status === "cancelled" ? onRetry : undefined}
        onUseDemo={run.mode === "live" ? onUseDemo : undefined}
      />
    );
  } else if (!idle && !ready) {
    canvas = <StageNotice kind="waiting" waitingFor={stage.waitingFor} />;
  } else if (!idle) {
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

  const liveRun = run.mode === "live" && !idle;

  return (
    <section id="journey" aria-labelledby="request-map-heading" className="scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="request-map-heading" className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Request map
        </h2>
        <p className="text-sm text-ink-2">
          {idle ? "Send a question to start the walkthrough." : "Select a stage to inspect it."}
        </p>
      </div>
      <div className={liveRun ? "grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : undefined}>
        <JourneyRail spec={railSpec} beats={beats} elapsed={elapsed} reduced={reduced} idle={idle} />
        {liveRun && <LiveAnswer run={run} />}
      </div>
      <div className="mt-4">
        <StageProgress
          stages={lesson.stages}
          current={index}
          beats={beats}
          elapsed={elapsed}
          reduced={reduced}
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
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.51fr)] lg:items-start">
            <div className="min-w-0">{canvas}</div>
            <Explanation
              stage={stage}
              index={index}
              total={lesson.stages.length}
              run={run}
              open={deeperOpen}
              onOpenChange={onDeeperChange}
            />
          </div>
        </>
      )}
    </section>
  );
}

function LiveAnswer({ run }: { run: RunState }) {
  const usage = run.done?.usage;
  const status = run.status === "done" ? "Complete" : run.status === "running" ? "Streaming…" : run.status === "cancelled" ? "Stopped" : "Interrupted";
  const seconds = (ms?: number) => ms == null ? "—" : `${(ms / 1000).toFixed(2)} s`;

  return (
    <section aria-labelledby="live-answer-heading" className="min-w-0 rounded-xl border border-line-2 bg-surface px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <h3 id="live-answer-heading" className="text-sm font-semibold">Claude’s answer</h3>
        <span role="status" className="text-xs font-medium text-[var(--return)]">{status}</span>
      </div>
      <p className="mt-2 max-h-44 overflow-auto text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-2" tabIndex={run.text ? 0 : undefined}>
        {run.text || (run.status === "running" ? "Waiting for the first words…" : run.error?.message || "The request ended before text arrived.")}
      </p>
      {run.text && run.error && <p className="mt-2 text-xs text-danger">{run.error.message}</p>}
      {run.status === "done" && (
        <dl aria-label="Live measurements" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-2 text-xs text-ink-2">
          <div><dt>First text</dt><dd className="font-mono font-medium tabular-nums text-ink">{seconds(run.firstChunkMs)}</dd></div>
          <div><dt>Total time</dt><dd className="font-mono font-medium tabular-nums text-ink">{seconds(run.totalMs)}</dd></div>
          {usage && <div><dt>Input / output tokens</dt><dd className="font-mono font-medium tabular-nums text-ink">{usage.inputTokens} / {usage.outputTokens}</dd></div>}
        </dl>
      )}
    </section>
  );
}

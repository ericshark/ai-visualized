"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { TopBar } from "@/components/TopBar";
import { createDemoAdapter } from "@/execution/demoAdapter";
import type { Mode } from "@/execution/events";
import { createLiveAdapter } from "@/execution/liveAdapter";
import { useHealth } from "@/execution/useHealth";
import { useRun } from "@/execution/useRun";
import { EXAMPLES } from "@/lessons/ai-request/examples";
import { defaultLesson } from "@/lessons/registry";
import { LessonPlayer } from "@/player/LessonPlayer";
import type { StageTiming } from "@/player/timeline";
import { usePlayback } from "@/player/usePlayback";

// Only the local dev server falls back to a backend on this machine. In production
// the URL must be set explicitly; without it the page stays in demo mode.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export function LessonApp() {
  const lesson = defaultLesson;
  const demo = useMemo(() => createDemoAdapter(EXAMPLES), []);
  const live = useMemo(() => createLiveAdapter({ baseUrl: API_URL }), []);
  const { run, start, cancel } = useRun({ demo, live });
  const { health } = useHealth(API_URL);

  const [mode, setMode] = useState<Mode>("demo");
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id);
  const [livePrompt, setLivePrompt] = useState(EXAMPLES[0].prompt);
  const [deeperOpen, setDeeperOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live mode is only possible while the backend reports a key.
  const effectiveMode: Mode = mode === "live" && health.status === "ready" ? "live" : "demo";
  const example = EXAMPLES.find((e) => e.id === exampleId) ?? EXAMPLES[0];
  const prompt = effectiveMode === "live" ? livePrompt : example.prompt;
  const maxChars = health.status === "ready" ? health.maxInputChars : 500;

  const timings = useMemo<StageTiming[]>(
    () => lesson.stages.map((stage) => ({ beats: stage.beats(run), gateAt: 0 })),
    [lesson, run],
  );
  const gateFor = useCallback((stage: number) => lesson.stages[stage]?.ready(run) ?? true, [lesson, run]);
  const playback = usePlayback(timings, gateFor);
  const { start: startPlayback, reduced } = playback;

  const begin = useCallback(
    (nextMode: Mode, text: string) => {
      if (!text) return;
      start({ mode: nextMode, prompt: text, exampleId: example.id });
      startPlayback();
      requestAnimationFrame(() =>
        document.getElementById("journey")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
      );
    },
    [start, startPlayback, example.id, reduced],
  );

  const send = useCallback(
    () => begin(effectiveMode, effectiveMode === "live" ? livePrompt.trim() : example.prompt),
    [begin, effectiveMode, livePrompt, example.prompt],
  );

  const askAnother = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    inputRef.current?.focus({ preventScroll: true });
  }, [reduced]);

  const useDemo = useCallback(() => {
    setMode("demo");
    begin("demo", example.prompt);
  }, [begin, example.prompt]);

  const pickExample = useCallback((id: string) => {
    setExampleId(id);
    const picked = EXAMPLES.find((e) => e.id === id);
    if (picked) setLivePrompt(picked.prompt);
  }, []);

  return (
    <>
      <TopBar lessonTitle={lesson.title} />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid gap-8 pt-10 pb-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-end lg:gap-14 lg:pb-14">
          <div>
            <h1 className="max-w-xl text-[38px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[52px]">
              {lesson.title}
            </h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              Press Send and follow one question from your screen to a language model and back, one stage at a time.
            </p>
          </div>
          <Composer
            mode={effectiveMode}
            onModeChange={setMode}
            health={health}
            examples={EXAMPLES.map((e) => ({ id: e.id, label: e.label }))}
            exampleId={example.id}
            onPickExample={pickExample}
            prompt={prompt}
            onPromptChange={setLivePrompt}
            maxChars={maxChars}
            onSend={send}
            onStop={cancel}
            streaming={run.status === "running" && run.mode === "live"}
            inputRef={inputRef}
          />
        </section>

        <LessonPlayer
          lesson={lesson}
          run={run}
          playback={playback}
          deeperOpen={deeperOpen}
          onDeeperChange={setDeeperOpen}
          onSend={send}
          onReplay={startPlayback}
          onAskAnother={askAnother}
          onRetry={send}
          onUseDemo={useDemo}
        />
      </main>
      <footer className="border-t border-line py-6 text-center text-[13px] text-ink-3">
        Every visual is labeled as sample data, measured, or a simulation. Model internals are never shown as if measured.
      </footer>
    </>
  );
}

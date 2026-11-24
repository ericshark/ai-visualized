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

const demo = createDemoAdapter(EXAMPLES);
const live = createLiveAdapter();

export function LessonApp() {
  const lesson = defaultLesson;
  const { run, start, cancel } = useRun({ demo, live });
  const health = useHealth();

  const [mode, setMode] = useState<Mode>("demo");
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id);
  const [livePrompt, setLivePrompt] = useState(EXAMPLES[0].prompt);
  const [deeperOpen, setDeeperOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    () => {
      if (run.status === "running" && run.mode === "live") return;
      begin(effectiveMode, effectiveMode === "live" ? livePrompt.trim() : example.prompt);
    },
    [begin, effectiveMode, livePrompt, example.prompt, run.mode, run.status],
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
      <TopBar />
      <main className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <section className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
          <div>
            <h1 className="max-w-[14ch] font-heading text-[clamp(2.55rem,6.3vw,5.5rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-ink">
              Follow an AI request.
            </h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              Send a question and see what happens between pressing Send and getting an answer.
            </p>
          </div>
          <Composer
            mode={effectiveMode}
            onModeChange={setMode}
            health={health}
            examples={EXAMPLES}
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
          onReplay={startPlayback}
          onAskAnother={askAnother}
          onRetry={send}
          onUseDemo={useDemo}
        />
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-sm text-ink-2">
        The lesson labels sample data, live measurements, and simulations throughout.
      </footer>
    </>
  );
}

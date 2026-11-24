"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { TopBar } from "@/components/TopBar";
import { createDemoAdapter } from "@/execution/demoAdapter";
import { useRun } from "@/execution/useRun";
import { EXAMPLES } from "@/lessons/ai-request/examples";
import { defaultLesson } from "@/lessons/registry";
import { LessonPlayer } from "@/player/LessonPlayer";
import type { StageTiming } from "@/player/timeline";
import { usePlayback } from "@/player/usePlayback";

const demo = createDemoAdapter(EXAMPLES);

export function LessonApp() {
  const lesson = defaultLesson;
  const { run, start } = useRun(demo);
  const [exampleId, setExampleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deeperOpen, setDeeperOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const timings = useMemo<StageTiming[]>(
    () => lesson.stages.map((stage) => ({ beats: stage.beats(run), gateAt: 0 })),
    [lesson, run],
  );
  const gateFor = useCallback((stage: number) => lesson.stages[stage]?.ready(run) ?? true, [lesson, run]);
  const playback = usePlayback(timings, gateFor);
  const { start: startPlayback, reduced } = playback;

  const pickExample = useCallback(
    (id: string) => {
      const example = EXAMPLES.find((entry) => entry.id === id);
      if (!example) return;
      setExampleId(id);
      setDeeperOpen(false);
      start({ prompt: example.prompt, exampleId: id });
      startPlayback();
      requestAnimationFrame(() => {
        document.getElementById("journey")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      });
    },
    [start, startPlayback, reduced],
  );

  const askAnother = useCallback(() => {
    triggerRef.current?.focus();
    setPickerOpen(true);
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
              Choose a question and follow a simulation from your browser to a language model and back.
            </p>
          </div>
          <Composer
            examples={EXAMPLES}
            exampleId={exampleId}
            onPickExample={pickExample}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            triggerRef={triggerRef}
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
        />
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-sm text-ink-2">
        The walkthrough runs in your browser with prepared questions, answers, and timings.
      </footer>
    </>
  );
}

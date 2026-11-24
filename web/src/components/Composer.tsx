"use client";

import { MoveRight, Square } from "lucide-react";
import type { Ref } from "react";
import type { Mode } from "@/execution/events";
import type { Health } from "@/execution/useHealth";
import { cn } from "@/lib/utils";

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  health: Health;
  examples: { id: string; label: string; prompt: string }[];
  exampleId: string;
  onPickExample: (id: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  maxChars: number;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  inputRef: Ref<HTMLTextAreaElement>;
}

export function Composer({
  mode, onModeChange, health, examples, exampleId, onPickExample, prompt,
  onPromptChange, maxChars, onSend, onStop, streaming, inputRef,
}: Props) {
  const live = mode === "live";
  const liveReady = health.status === "ready";
  const canSend = !streaming && (!live || (liveReady && Boolean(prompt.trim())));
  const hint = live && liveReady
    ? "Your question goes to Claude Haiku 5.5."
    : liveReady
      ? "Follow a prepared answer or switch to Claude Live."
      : health.status === "checking"
        ? "Checking Claude Live availability…"
        : "Claude Live is unavailable here. You can still run a sample.";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
      className="min-w-0 rounded-2xl border border-line-2 bg-surface p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="prompt" className="text-sm font-semibold text-ink">Your question</label>
        <div role="group" aria-label="Answer source" className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5">
          {(["demo", "live"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              disabled={streaming || (value === "live" && !liveReady)}
              onClick={() => onModeChange(value)}
              className={cn(
                "min-h-9 rounded-md px-2.5 text-xs font-semibold sm:px-3 sm:text-sm",
                mode === value ? "bg-surface text-accent shadow-sm" : "text-ink-2 hover:text-accent",
                "disabled:opacity-55",
              )}
            >
              {value === "demo" ? "Sample" : "Claude Live"}
            </button>
          ))}
        </div>
      </div>

      <textarea
        id="prompt"
        ref={inputRef}
        rows={2}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        readOnly={!live || streaming}
        maxLength={live ? maxChars : undefined}
        aria-describedby="mode-hint"
        className="block min-h-18 w-full resize-y rounded-xl border border-line-2 bg-paper px-3.5 py-2.5 text-base leading-snug text-ink caret-accent"
      />

      <div className="my-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Example questions">
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            disabled={streaming}
            aria-pressed={live ? example.prompt === prompt : example.id === exampleId}
            onClick={() => onPickExample(example.id)}
            className="min-h-8 rounded-md border border-line px-2.5 text-xs font-medium text-ink-2 hover:border-accent-line hover:text-accent aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent-strong disabled:opacity-55"
          >
            {example.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p id="mode-hint" className="max-w-54 text-xs leading-relaxed text-ink-2">
          {hint}
          {live && <span className="ml-1 font-mono tabular-nums">{prompt.length}/{maxChars}</span>}
        </p>
        {streaming ? (
          <button type="button" onClick={onStop} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-2 px-4 text-sm font-semibold hover:bg-surface-2">
            <Square className="size-3.5" aria-hidden /> Stop
          </button>
        ) : (
          <button type="submit" disabled={!canSend} className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            Send question <MoveRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}

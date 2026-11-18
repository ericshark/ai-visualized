"use client";

import { Send, Square } from "lucide-react";
import type { Ref } from "react";
import type { Mode } from "@/execution/events";
import type { Health } from "@/execution/useHealth";
import { cn } from "@/lib/utils";
import { Tip } from "./Tip";

export interface ExampleOption {
  id: string;
  label: string;
}

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  health: Health;
  examples: ExampleOption[];
  exampleId: string;
  onPickExample: (id: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  maxChars: number;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  inputRef: Ref<HTMLInputElement>;
}

function liveHint(health: Health): string {
  switch (health.status) {
    case "checking":
      return "Checking whether the backend is running…";
    case "offline":
      return "Live mode needs the backend, which is not connected here. To try it, run the project locally with the backend (see the README).";
    case "no-key":
      return "The backend is running but has no OpenAI API key. Add OPENAI_API_KEY to backend/.env.";
    case "ready":
      return `Live sends a real request through the backend to ${health.model}.`;
  }
}

export function Composer({
  mode,
  onModeChange,
  health,
  examples,
  exampleId,
  onPickExample,
  prompt,
  onPromptChange,
  maxChars,
  onSend,
  onStop,
  streaming,
  inputRef,
}: Props) {
  const live = mode === "live";
  const liveReady = health.status === "ready";
  const tooLong = prompt.length > maxChars;
  const canSend = (!live || (prompt.trim().length > 0 && !tooLong)) && (!live || liveReady);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
      className="rounded-2xl border border-line bg-surface p-3 shadow-float sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Example questions">
        <span className="mr-1 text-[13px] text-ink-2">Try</span>
        {examples.map((example) => {
          const selected = example.label === prompt || (!live && example.id === exampleId);
          return (
            <button
              key={example.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onPickExample(example.id)}
              className={cn(
                "h-8 rounded-lg border px-3 text-[13.5px] transition-colors",
                selected
                  ? "border-accent-line bg-accent-soft font-medium text-accent-strong"
                  : "border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
              )}
            >
              {example.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="prompt">
          Your question
        </label>
        <input
          id="prompt"
          ref={inputRef}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          readOnly={!live}
          maxLength={live ? maxChars + 40 : undefined}
          autoComplete="off"
          placeholder="Ask anything"
          aria-describedby="mode-hint"
          className={cn(
            "h-12 w-full min-w-0 shrink-0 rounded-xl border sm:flex-1 border-line-2 px-4 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent/20",
            live ? "bg-surface" : "cursor-default bg-surface-2/70",
          )}
        />
        <div className="flex gap-2">
          {streaming && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-2 bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink-3 hover:bg-surface-2"
            >
              <Square className="size-3.5 fill-current" />
              Stop
            </button>
          )}
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-6 text-[15px] font-medium text-white transition-[background-color,transform] hover:bg-accent-strong active:translate-y-px disabled:pointer-events-none disabled:opacity-40 sm:flex-none"
          >
            Send
            <Send className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Data source" className="inline-flex rounded-lg border border-line-2 bg-surface-2/70 p-0.5">
          {(["demo", "live"] as const).map((value) => {
            const disabled = value === "live" && !liveReady;
            const button = (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                aria-disabled={disabled}
                onClick={() => !disabled && onModeChange(value)}
                className={cn(
                  "h-8 rounded-md px-3.5 text-[13.5px] font-medium transition-colors",
                  mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
                  disabled && "cursor-not-allowed opacity-55 hover:text-ink-2",
                )}
              >
                {value === "demo" ? "Demo" : "Live"}
              </button>
            );
            return disabled ? (
              <Tip key={value} content={liveHint(health)}>
                {button}
              </Tip>
            ) : (
              button
            );
          })}
        </div>
        <p id="mode-hint" className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
          {live
            ? tooLong
              ? `Keep it under ${maxChars} characters (${prompt.length} now).`
              : liveHint(health)
            : "Demo plays recorded sample answers, so it works without an API key. Switch to Live to type your own."}
        </p>
      </div>
    </form>
  );
}

"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type { Ref } from "react";

interface Props {
  examples: { id: string; prompt: string }[];
  exampleId: string | null;
  onPickExample: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: Ref<HTMLButtonElement>;
}

export function Composer({ examples, exampleId, onPickExample, open, onOpenChange, triggerRef }: Props) {
  return (
    <div className="min-w-0 rounded-2xl border border-line-2 bg-surface p-4 sm:p-5">
      <label htmlFor="prompt" className="mb-3 block text-sm font-semibold text-ink">Your question</label>
      <Select.Root
        value={exampleId}
        items={examples.map(({ id, prompt }) => ({ value: id, label: prompt }))}
        open={open}
        onOpenChange={onOpenChange}
        onValueChange={(id) => {
          if (id !== null) onPickExample(id);
        }}
      >
        <Select.Trigger
          id="prompt"
          ref={triggerRef}
          aria-describedby="question-hint"
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line-2 bg-paper px-3.5 py-2.5 text-left text-base leading-snug text-ink transition-colors hover:border-accent-line data-popup-open:border-accent"
        >
          <Select.Value placeholder="Choose a question" />
          <Select.Icon><ChevronDown className="size-5 shrink-0 text-accent" aria-hidden /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner alignItemWithTrigger={false} align="start" sideOffset={6} className="z-40 w-(--anchor-width)">
            <Select.Popup className="max-h-(--available-height) overflow-auto rounded-xl border border-line-2 bg-surface p-1.5 shadow-raised">
              <Select.List>
                {examples.map(({ id, prompt }) => (
                  <Select.Item
                    key={id}
                    value={id}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-highlighted:bg-accent-soft data-highlighted:text-accent-strong"
                  >
                    <Select.ItemText>{prompt}</Select.ItemText>
                    <Select.ItemIndicator><Check className="size-4 text-accent" aria-hidden /></Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <p id="question-hint" className="mt-3 text-sm leading-relaxed text-ink-2">
        Picking a question starts the walkthrough. Each answer is prepared for the lesson.
      </p>
    </div>
  );
}

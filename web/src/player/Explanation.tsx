"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { CodeBlock } from "@/components/CodeBlock";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RunState } from "@/execution/runReducer";
import type { DeeperBlock, StageDefinition } from "@/lessons/types";
import { cn } from "@/lib/utils";

function Block({ block }: { block: DeeperBlock }) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-[13px] font-semibold text-ink">{block.title}</h4>
      {block.kind === "text" && <p className="text-[14px] leading-relaxed text-ink-2">{block.body}</p>}
      {block.kind === "code" && (
        <>
          <CodeBlock code={block.code} />
          {block.caption && <p className="text-[13px] leading-snug text-ink-3">{block.caption}</p>}
        </>
      )}
      {block.kind === "facts" && (
        <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
          {block.items.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-4 px-3 py-1.5 text-[13px]">
              <dt className="text-ink-2">{item.label}</dt>
              <dd className="text-right font-mono text-[12.5px] text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

interface Props {
  stage: StageDefinition;
  index: number;
  total: number;
  run: RunState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Explanation({ stage, index, total, run, open, onOpenChange }: Props) {
  const reduce = useReducedMotion();
  const blocks = stage.deeper(run);

  return (
    <motion.div
      key={stage.id}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6"
    >
      {/* Announced to screen readers whenever the stage changes. */}
      <div aria-live="polite" aria-atomic="true">
        <p className="text-[13px] text-ink-3">
          Stage {index + 1} of {total}
        </p>
        <h2 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight text-balance text-ink">{stage.title}</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink">{stage.simple}</p>
      </div>

      <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[14px] leading-snug">
        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <dt className="font-medium text-ink">Why</dt>
          <dd className="text-ink-2">{stage.why}</dd>
        </div>
        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <dt className="font-medium text-ink">Result</dt>
          <dd className="text-ink-2">{stage.changes}</dd>
        </div>
      </dl>

      <Collapsible open={open} onOpenChange={onOpenChange} className="mt-5">
        <CollapsibleTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-ink-3 hover:bg-surface-2",
            open && "border-accent-line bg-accent-soft/60 text-accent-strong",
          )}
        >
          Go deeper
          <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0">
          <div className="space-y-5 pt-4">
            {blocks.map((block, i) => (
              <Block key={`${block.title}-${i}`} block={block} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

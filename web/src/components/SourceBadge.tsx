"use client";

import { cn } from "@/lib/utils";
import { Tip } from "./Tip";

export type BadgeKind = "demo" | "observed" | "conceptual" | "example" | "estimate";

const BADGES: Record<BadgeKind, { label: string; tip: string; className: string }> = {
  demo: {
    label: "Sample data",
    tip: "Written for this lesson. Timings follow a typical request but were not measured from a live model.",
    className: "border-line-2 bg-surface text-ink-2",
  },
  observed: {
    label: "Measured",
    tip: "Captured from your live request.",
    className: "border-ok/30 bg-ok-soft text-ok",
  },
  conceptual: {
    label: "Simulation",
    tip: "A simplified teaching picture. It is not measured from the model; the API does not expose what happens inside.",
    className: "border-dashed border-accent-line bg-accent-soft text-accent-strong",
  },
  example: {
    label: "Example values",
    tip: "Illustrative numbers chosen for the lesson, not produced by a model.",
    className: "border-dashed border-warn/40 bg-warn-soft text-warn",
  },
  estimate: {
    label: "Close estimate",
    tip: "Computed with a closely related tokenizer. Exact boundaries for this model may differ slightly.",
    className: "border-dashed border-warn/40 bg-warn-soft text-warn",
  },
};

export function SourceBadge({
  kind,
  label,
  tip,
  className,
}: {
  kind: BadgeKind;
  label?: string;
  tip?: string;
  className?: string;
}) {
  const badge = BADGES[kind];
  return (
    <Tip content={tip ?? badge.tip}>
      <button
        type="button"
        className={cn(
          "inline-flex h-6 shrink-0 cursor-help items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
          badge.className,
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full bg-current",
            (kind === "conceptual" || kind === "example" || kind === "estimate") && "opacity-60",
          )}
        />
        {label ?? badge.label}
      </button>
    </Tip>
  );
}

export function sourceKind(source: "demo" | "observed"): BadgeKind {
  return source === "observed" ? "observed" : "demo";
}

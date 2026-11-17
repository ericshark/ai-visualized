"use client";

import type { MotionValue } from "motion/react";
import { NODE_ICONS } from "@/components/NodeIcons";
import { Tip } from "@/components/Tip";
import { NODES } from "@/lessons/ai-request/content";
import type { NodeId, RailSpec } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { progressOf, type Beat } from "./timeline";
import { useStageTime } from "./useStageTime";

const ORDER: NodeId[] = ["browser", "backend", "provider", "model"];
/** Centre of each of the four equal columns, in percent. */
const centre = (i: number) => 12.5 + i * 25;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const DASH = "repeating-linear-gradient(90deg, var(--line-2) 0 5px, transparent 5px 10px)";
const DASH_ACTIVE = "repeating-linear-gradient(90deg, var(--accent-line) 0 5px, transparent 5px 10px)";

interface Props {
  spec: RailSpec;
  beats: Beat[];
  elapsed: MotionValue<number>;
  reduced: boolean;
  idle?: boolean;
}

/**
 * The four places a request passes through, shown on every stage so the
 * journey stays in view. Packets and chunks move along it.
 */
export function JourneyRail({ spec, beats, elapsed, reduced, idle = false }: Props) {
  const ms = useStageTime(elapsed, reduced);

  let packet: { pos: number } | null = null;
  if (spec.travel && !reduced) {
    const p = progressOf(beats, spec.travel.beat, ms);
    if (p > 0 && p < 1) {
      const from = ORDER.indexOf(spec.travel.from);
      const to = ORDER.indexOf(spec.travel.to);
      packet = { pos: from + (to - from) * easeInOut(p) };
    }
  }

  const chunks: number[] = [];
  if (spec.returning && !reduced) {
    for (const t of spec.returning.times) {
      const q = (ms - t) / spec.returning.travelMs;
      if (q > 0 && q < 1) chunks.push(3 * (1 - q));
    }
  }

  return (
    <div className="relative rounded-2xl border border-line bg-surface px-1 pt-4 pb-3 shadow-raised sm:px-3 sm:pt-5">
      <div className="relative grid grid-cols-4">
        {/* connections between neighbouring nodes */}
        {[0, 1, 2].map((i) => {
          const lit = !idle && spec.active.includes(ORDER[i]) && spec.active.includes(ORDER[i + 1]);
          const inside = i === 2; // provider to model happens inside the provider's systems
          return (
            <div
              key={i}
              aria-hidden
              className="absolute top-[22px] h-0.5 sm:top-[26px]"
              style={{
                left: `${centre(i)}%`,
                width: "25%",
                background: inside ? (lit ? DASH_ACTIVE : DASH) : lit ? "var(--accent-line)" : "var(--line-2)",
                transition: "background 300ms",
              }}
            />
          );
        })}

        {packet && (
          <div
            aria-hidden
            className="absolute top-[14px] z-10 h-4 w-6 -translate-x-1/2 rounded-[5px] bg-accent shadow-sm sm:top-[17px]"
            style={{ left: `${centre(0) + packet.pos * 25}%` }}
          >
            <svg viewBox="0 0 24 16" className="size-full" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4l9 6 9-6" />
            </svg>
          </div>
        )}

        {chunks.map((pos, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute top-[18px] z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent sm:top-[21px]"
            style={{ left: `${centre(0) + pos * 25}%` }}
          />
        ))}

        {ORDER.map((id) => {
          const Icon = NODE_ICONS[id];
          const on = !idle && spec.active.includes(id);
          const node = NODES[id];
          return (
            <Tip key={id} content={node.detail} side="bottom">
              <button
                type="button"
                className="group relative z-20 flex min-w-0 cursor-help flex-col items-center gap-1.5 rounded-xl px-1 text-center"
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl border bg-surface transition-colors duration-300 sm:size-[52px]",
                    on
                      ? "border-accent bg-accent-soft text-accent shadow-[0_0_0_4px_var(--accent-soft)]"
                      : "border-line-2 text-ink-3",
                  )}
                >
                  <Icon />
                </span>
                <span className={cn("text-[12px] leading-tight font-medium sm:text-[13px]", on ? "text-ink" : "text-ink-3")}>
                  {node.name}
                </span>
              </button>
            </Tip>
          );
        })}
      </div>
    </div>
  );
}

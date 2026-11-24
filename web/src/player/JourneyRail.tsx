"use client";

import type { MotionValue } from "motion/react";
import { NODE_ICONS } from "@/components/NodeIcons";
import { NODES } from "@/lessons/ai-request/content";
import type { NodeId, RailSpec } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { progressOf, type Beat } from "./timeline";
import { useStageTime } from "./useStageTime";

const ORDER: NodeId[] = ["browser", "backend", "provider", "model"];
/** Centre of each of the four equal columns, in percent. */
const centre = (i: number) => 12.5 + i * 25;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

  const returning = Boolean(spec.returning);
  const requestLit = !idle && !returning;

  return (
    <div className="request-map flex min-w-0 flex-col justify-center rounded-2xl px-2 py-5 text-white sm:px-4 sm:py-7">
      <div className="relative grid grid-cols-4">
        <div aria-hidden className="absolute inset-x-[12.5%] top-6 grid grid-cols-3">
          {ORDER.slice(0, -1).map((id) => (
            <div key={id}>
              <div className={cn(
                "route-lane relative -top-1.5 h-0 border-t-[1.5px] border-current",
                requestLit || idle ? "text-[var(--map-request)]" : "text-[var(--map-request)]/40",
              )} />
              <div className={cn(
                "route-lane route-lane-return relative top-1.5 h-0 border-t-[1.5px] border-current",
                returning || idle ? "text-[var(--map-return)]" : "text-[var(--map-return)]/40",
              )} />
            </div>
          ))}
        </div>

        {packet && (
          <div
            aria-hidden
            className="absolute top-2.5 z-20 h-4 w-6 -translate-x-1/2 rounded border border-[var(--map-request)] bg-accent"
            style={{ left: `${centre(0) + packet.pos * 25}%` }}
          >
            <svg viewBox="0 0 24 16" className="size-full" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4l9 6 9-6" />
            </svg>
          </div>
        )}

        {chunks.map((pos, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-[25px] z-20 size-2.5 -translate-x-1/2 rounded-full border border-[var(--map-ground)] bg-[var(--map-return)]"
            style={{ left: `${centre(0) + pos * 25}%` }}
          />
        ))}

        {ORDER.map((id) => {
          const Icon = NODE_ICONS[id];
          const on = spec.active.includes(id);
          const node = NODES[id];
          return (
            <div key={id} className="relative z-10 flex min-w-0 flex-col items-center gap-2 px-1 text-center">
              <span className={cn(
                "grid size-12 place-items-center rounded-xl border transition-colors",
                on && returning && "border-[var(--map-return)] bg-[var(--map-return)] text-ink",
                on && !returning && "border-[var(--map-request)] bg-[var(--map-request)] text-ink",
                !on && "border-[var(--map-line)] bg-[var(--map-node)] text-[#e0e8f9]",
              )}>
                <Icon />
              </span>
              <span className="text-xs leading-tight font-semibold text-white sm:text-base">{node.name}</span>
              <span className="max-w-[12ch] text-[11px] leading-snug text-[#cad5e7] sm:max-w-none sm:text-sm">{node.action}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-medium sm:mt-5">
        <span className="flex items-center gap-2 text-[var(--map-request)]">
          <span aria-hidden className="h-0.5 w-4 bg-current" /> Outgoing request
        </span>
        <span className="flex items-center gap-2 text-[var(--map-return)]">
          <span aria-hidden className="h-0.5 w-4 bg-current" /> Returning answer
        </span>
      </div>
    </div>
  );
}

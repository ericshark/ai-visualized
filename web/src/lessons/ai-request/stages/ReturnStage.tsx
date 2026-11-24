"use client";

import { SourceBadge, sourceKind } from "@/components/SourceBadge";
import type { StageProps } from "@/lessons/types";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { AssistantBubble, ChatWindow, Panel, StageFrame, UserBubble, clamp01, easeOut } from "./shared";

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

export function ReturnStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);

  const first = run.firstChunkMs ?? 0;
  const total = run.totalMs ?? Math.max(first, 1);
  // The replay runs at the speed the chunks actually arrived.
  const now = Math.min(ms, total);
  const visible = run.chunks.filter((c) => c.t <= now);
  const text = visible.map((c) => c.text).join("");
  const waiting = now < first;
  const summary = easeOut(progressOf(beats, "summary", ms));

  const markerLeft = (t: number) => `${clamp01(t / total) * 100}%`;

  return (
    <StageFrame badges={<SourceBadge kind={sourceKind(run.source as "demo" | "observed")} label={run.mode === "live" ? "Measured timing" : "Sample timing"} />}>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ChatWindow>
          <UserBubble text={run.prompt} />
          <AssistantBubble>
            {waiting ? (
              <span className="flex h-5 items-center gap-1" aria-label="Waiting for the first words">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 rounded-full bg-ink-3" style={{ opacity: 0.35 + 0.65 * Math.abs(Math.sin(ms / 260 + i * 0.8)) }} />
                ))}
              </span>
            ) : (
              <span className="relative block">
                {/* the full answer, invisible, keeps the bubble from jumping in size */}
                <span aria-hidden className="invisible">
                  {run.text}
                </span>
                <span className="absolute inset-0">{text}</span>
              </span>
            )}
          </AssistantBubble>
        </ChatWindow>

        <div className="flex flex-col justify-center gap-5">
          <Panel title="Time since you pressed Send">
            <div className="relative mt-6 mb-9 h-2 rounded-full bg-line">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent/80" style={{ width: markerLeft(now) }} />
              {run.chunks.map((c, i) => (
                <span key={i} aria-hidden className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-ink-3/50" style={{ left: markerLeft(c.t) }} />
              ))}
              <span aria-hidden className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface" style={{ left: markerLeft(now) }} />

              <span className="absolute top-4 -translate-x-1/2 text-[12.5px] whitespace-nowrap text-ink" style={{ left: markerLeft(first), opacity: now >= first ? 1 : 0.35 }}>
                First words
              </span>
              <span className="absolute top-4 right-0 text-[12.5px] text-ink-3" style={{ opacity: now >= total ? 1 : 0.35 }}>
                Done
              </span>
            </div>
            <p className="font-mono text-[22px] font-medium text-ink tabular-nums">{seconds(now)}</p>
          </Panel>

          <div className="grid grid-cols-2 gap-3" style={{ opacity: summary, transform: `translateY(${(1 - summary) * 8}px)` }}>
            <Panel tone="accent">
              <p className="text-[13px] text-ink-2">Time to first text</p>
              <p className="mt-1 font-mono text-[20px] font-medium text-ink">{seconds(first)}</p>
            </Panel>
            <Panel>
              <p className="text-[13px] text-ink-2">Total time</p>
              <p className="mt-1 font-mono text-[20px] font-medium text-ink">{seconds(total)}</p>
            </Panel>
            <p className="col-span-2 text-[14px] leading-snug text-ink-2">
              Because the answer streams, you can start reading after {seconds(first)} instead of waiting {seconds(total)}. This replay runs at the speed the chunks {run.mode === "live" ? "actually " : ""}arrived.
            </p>
          </div>
        </div>
      </div>
    </StageFrame>
  );
}

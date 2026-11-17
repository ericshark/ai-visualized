"use client";

import { SourceBadge, sourceKind } from "@/components/SourceBadge";
import type { StageProps } from "@/lessons/types";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { ChatWindow, StageFrame, UserBubble, easeInOut, easeOut, stagger } from "./shared";

export function SendStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const p = (id: string) => progressOf(beats, id, ms);

  const prompt = run.prompt;
  const typing = p("type");
  const typed = prompt.slice(0, Math.ceil(typing * prompt.length));
  const press = p("press");
  const bubble = easeOut(p("bubble"));
  const fold = easeInOut(p("fold"));
  const fields = p("fields");

  const request = run.request;
  const lines = [
    { label: "What to do", value: request?.method ?? "POST", note: "send data to the server" },
    { label: "Where to send it", value: request?.url ?? "/api/chat/stream", note: "an address on the app's server" },
    { label: "Format", value: "Content-Type: application/json", note: "the message is structured text" },
    { label: "Your message", value: JSON.stringify(request?.body ?? { prompt }), note: "what you typed, as JSON" },
  ];

  const inputText = press > 0.5 ? "" : typed;
  const bubbleVisible = bubble > 0;

  return (
    <StageFrame badges={<SourceBadge kind={sourceKind(run.source as "demo" | "observed")} />}>
      <div className="grid flex-1 gap-5 lg:grid-cols-2 lg:items-center">
        <ChatWindow
          footer={
            <div className="flex items-center gap-2 border-t border-line bg-surface p-2.5">
              <div className="flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-line-2 bg-paper px-3 text-[15px] text-ink">
                <span className="truncate">{inputText}</span>
                {typing < 1 && <span aria-hidden className="ml-0.5 h-5 w-px animate-pulse bg-ink" />}
                {!inputText && typing >= 1 && <span className="text-ink-3">Message</span>}
              </div>
              <div
                aria-hidden
                className="flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white"
                style={{
                  transform: `scale(${1 - 0.07 * Math.sin(Math.PI * press)})`,
                  filter: press > 0 && press < 1 ? "brightness(0.9)" : undefined,
                }}
              >
                Send
              </div>
            </div>
          }
        >
          {bubbleVisible && (
            <UserBubble
              text={prompt}
              style={{
                opacity: bubble * (1 - fold * 0.45),
                transform: `translateY(${(1 - bubble) * 14}px)`,
              }}
            />
          )}
        </ChatWindow>

        <div
          className="rounded-xl border border-accent-line bg-accent-soft/40 p-4"
          style={{
            opacity: fold,
            transform: `translate(${(1 - fold) * -28}px, 0) scale(${0.96 + fold * 0.04})`,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-ink">The request</h3>
            <span className="rounded-md border border-accent-line bg-surface px-2 py-0.5 font-mono text-xs font-medium text-accent-strong">
              POST
            </span>
          </div>
          <ul className="space-y-2">
            {lines.map((line, i) => {
              const t = easeOut(stagger(fields, i, lines.length, 1.6));
              return (
                <li
                  key={line.label}
                  className="rounded-lg border border-line bg-surface px-3 py-2"
                  style={{ opacity: t, transform: `translateY(${(1 - t) * 8}px)` }}
                >
                  <p className="text-[13px] text-ink-2">
                    {line.label}
                    <span className="text-ink-3"> · {line.note}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[13px] break-words text-ink">{line.value}</p>
                </li>
              );
            })}
          </ul>
          {request && (
            <p className="mt-3 text-[13px] text-ink-3" style={{ opacity: easeOut(stagger(fields, 4, 5, 1.6)) }}>
              {request.bytes} bytes, sent over an encrypted connection.
            </p>
          )}
        </div>
      </div>
    </StageFrame>
  );
}

"use client";

import { Lock } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import type { StageProps } from "@/lessons/types";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { Check, Panel, StageFrame, easeInOut, easeOut, stagger } from "./shared";

export function BackendStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const p = (id: string) => progressOf(beats, id, ms);

  const arrive = easeInOut(p("travel"));
  const checkP = p("checks");
  const prepareP = p("prepare");

  const checks = run.validated?.checks ?? [];
  const request = run.request;
  const provider = run.provider;

  const layers = [
    {
      title: "Instructions from the app",
      body: provider?.instructions ?? "Instructions the app adds to every request.",
      tone: "plain" as const,
    },
    { title: "Your message", body: run.prompt, tone: "accent" as const },
    {
      title: "Settings",
      body: provider ? `Model ${provider.model}, answer length limit` : "Model and limits",
      tone: "plain" as const,
    },
  ];

  return (
    <StageFrame badges={<SourceBadge kind="demo" />}>
      <div className="grid flex-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div style={{ opacity: easeOut(arrive * 3), transform: `translateX(${(1 - arrive) * -60}px)` }}>
            <Panel title="Request arrives" tone="accent">
              <p className="font-mono text-[13px] text-ink">
                {request?.method ?? "POST"} {request?.url ?? "/api/chat/stream"}
              </p>
              <p className="mt-1 font-mono text-[13px] break-words text-ink-2">{JSON.stringify(request?.body ?? { prompt: run.prompt })}</p>
            </Panel>
          </div>

          <Panel title="The server checks it" className="transition-opacity" >
            <ul className="space-y-2.5">
              {checks.map((check, i) => {
                const t = stagger(checkP, i, checks.length, 1.4);
                return (
                  <li key={check.id} className="flex items-center gap-2.5 text-[14px]" style={{ opacity: 0.35 + 0.65 * easeOut(t) }}>
                    <Check done={t >= 1} />
                    <span className={t >= 1 ? "text-ink" : "text-ink-2"}>{check.label}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="The server prepares the AI request" tone="dashed" className="flex flex-col gap-2.5">
          {layers.map((layer, i) => {
            const t = easeOut(stagger(prepareP, i, 4, 1.4));
            return (
              <div key={layer.title} style={{ opacity: t, transform: `translateY(${(1 - t) * 10}px)` }}>
                <Panel tone={layer.tone} className="py-2.5">
                  <p className="text-[13px] font-medium text-ink-2">{layer.title}</p>
                  <p className="mt-0.5 line-clamp-3 text-[14px] leading-snug text-ink">{layer.body}</p>
                </Panel>
              </div>
            );
          })}
          <div style={{ opacity: easeOut(stagger(prepareP, 3, 4, 1.4)), transform: `translateY(${(1 - easeOut(stagger(prepareP, 3, 4, 1.4))) * 10}px)` }}>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <Lock className="size-4 shrink-0 text-ink-2" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-2">Secret API key</p>
                <p className="font-mono text-[13px] text-ink-3">••••••••••••••••</p>
              </div>
              <p className="ml-auto hidden text-right text-[12.5px] leading-tight text-ink-3 sm:block">
                added here,
                <br />
                never in your browser
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </StageFrame>
  );
}

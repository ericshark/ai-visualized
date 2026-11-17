"use client";

import { ArrowRight } from "lucide-react";
import { ModelIcon } from "@/components/NodeIcons";
import { SourceBadge, sourceKind } from "@/components/SourceBadge";
import { Tip } from "@/components/Tip";
import type { StageProps } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { Panel, StageFrame, easeInOut, easeOut, stagger } from "./shared";

const SETTING_HELP: Record<string, string> = {
  max_output_tokens: "The longest answer the model may write, counted in tokens.",
  stream: "Send the answer back piece by piece instead of all at once.",
  reasoning_effort: "How much hidden thinking the model does before answering. None here.",
  top_logprobs: "Also return the most likely alternatives for each token.",
};

export function ProviderStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const p = (id: string) => progressOf(beats, id, ms);

  const arrive = easeInOut(p("travel"));
  const unpack = p("unpack");
  const toModel = easeInOut(p("model"));

  const provider = run.provider;
  const settings = Object.entries(provider?.settings ?? {});
  const sections = [
    { title: "Instructions from the app", body: provider?.instructions ?? "", muted: true },
    { title: "Your message", body: run.prompt, muted: false },
  ];

  return (
    <StageFrame badges={<SourceBadge kind={sourceKind(run.source as "demo" | "observed")} />}>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)] lg:items-center">
        <div style={{ opacity: easeOut(arrive * 3), transform: `translateX(${(1 - arrive) * -60}px)` }}>
          <Panel title={`Request received by ${provider?.provider ?? "the provider"}`} tone="accent" className="space-y-3">
            {sections.map((section, i) => {
              const t = easeOut(stagger(unpack, i, 3, 1.5));
              return (
                <div key={section.title} style={{ opacity: t, transform: `translateY(${(1 - t) * 8}px)` }}>
                  <p className="text-[13px] font-medium text-ink-2">{section.title}</p>
                  <div className={cn("mt-0.5 rounded-lg border border-line bg-surface px-3 py-2 text-[14px] leading-snug", section.muted ? "text-ink-2" : "text-ink")}>
                    <p className="line-clamp-4">{section.body}</p>
                  </div>
                </div>
              );
            })}
            <div style={{ opacity: easeOut(stagger(unpack, 2, 3, 1.5)) }}>
              <p className="mb-1 text-[13px] font-medium text-ink-2">Settings</p>
              <ul className="flex flex-wrap gap-1.5">
                {settings.map(([key, value]) => (
                  <li key={key}>
                    <Tip content={SETTING_HELP[key] ?? key}>
                      <button type="button" className="cursor-help rounded-md border border-line-2 bg-surface px-2 py-1 font-mono text-[12px] text-ink">
                        {key}: {String(value)}
                      </button>
                    </Tip>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

        <ArrowRight
          aria-hidden
          className="mx-auto size-6 rotate-90 text-ink-3 lg:rotate-0"
          style={{ opacity: 0.25 + 0.75 * toModel }}
        />

        <div
          className={cn(
            "rounded-xl border p-4 transition-colors duration-300",
            toModel > 0.5 ? "border-accent bg-accent-soft/60" : "border-line-2 bg-surface-2/60",
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn("flex size-11 items-center justify-center rounded-xl border bg-surface", toModel > 0.5 ? "border-accent text-accent" : "border-line-2 text-ink-3")}>
              <ModelIcon />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-ink-2">Model</p>
              <p className="truncate font-mono text-[15px] font-medium text-ink">{provider?.model ?? "model"}</p>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-snug text-ink-2">
            {toModel > 0.5
              ? "The model reads everything above as its context. It has no other memory of you."
              : "Waiting for the provider to hand over the request."}
          </p>
        </div>
      </div>
    </StageFrame>
  );
}

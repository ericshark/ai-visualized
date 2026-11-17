"use client";

import { SourceBadge } from "@/components/SourceBadge";
import { Tip } from "@/components/Tip";
import { TokenChip } from "@/components/TokenChip";
import type { Token } from "@/execution/events";
import type { StageProps } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { StageFrame, easeOut, stagger } from "./shared";

/** Only used if the run carried no tokens; clearly labelled illustrative then. */
function roughSplit(text: string): Token[] {
  return (text.match(/\s?[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [text]).map((t) => ({ text: t }));
}

export function TokensStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const p = (id: string) => progressOf(beats, id, ms);

  const tokens = run.inputTokens?.tokens ?? roughSplit(run.prompt);
  const hasIds = tokens.every((t) => t.id !== undefined);
  const split = p("split");
  const ids = easeOut(p("ids"));
  const explore = p("explore");

  const n = tokens.length;
  const size = n <= 14 ? "lg" : n <= 40 ? "md" : "sm";

  const badge = !run.inputTokens ? (
    <SourceBadge kind="example" label="Illustrative split" tip="This run carried no tokenizer output, so the boundaries shown here are only an illustration." />
  ) : run.inputTokens.exact ? (
    <SourceBadge kind="observed" label="Real tokenizer" tip="Computed by the model's own tokenizer for this exact text." />
  ) : (
    <SourceBadge kind="estimate" />
  );

  return (
    <StageFrame badges={badge}>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="flex flex-wrap items-start gap-y-4" role="list" aria-label="Tokens of your message">
          {tokens.map((token, i) => {
            const t = easeOut(stagger(split, i, n, 3));
            const chipStyle = {
              background: `color-mix(in srgb, var(--tok-${(i % 6) + 1}) ${t * 100}%, transparent)`,
              borderColor: `color-mix(in srgb, var(--tok-${(i % 6) + 1}-line) ${t * 100}%, transparent)`,
              marginRight: `${t * 5}px`,
            };
            return (
              <div key={i} role="listitem" className="flex flex-col items-center gap-1.5">
                <Tip
                  content={
                    <span>
                      Token {i + 1} of {n}
                      {token.id !== undefined && (
                        <>
                          <br />
                          ID <span className="font-mono">{token.id}</span>
                        </>
                      )}
                    </span>
                  }
                >
                  <TokenChip text={token.text} index={i} size={size} style={chipStyle} className="cursor-help" />
                </Tip>
                {hasIds && (
                  <span
                    className="font-mono text-[11px] text-ink-3 sm:text-xs"
                    style={{ opacity: stagger(ids, i, n, 3) * ids, transform: `translateY(${(1 - ids) * -4}px)` }}
                  >
                    {token.id}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <dl
          className={cn("grid max-w-md grid-cols-3 gap-3 transition-opacity")}
          style={{ opacity: easeOut(explore * 2) }}
        >
          {[
            ["Characters", String(run.prompt.length)],
            ["Tokens", String(n)],
            ["Vocabulary", run.inputTokens?.encoding ?? "n/a"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-surface-2/60 px-3 py-2">
              <dt className="text-[12.5px] text-ink-2">{label}</dt>
              <dd className="mt-0.5 truncate font-mono text-[14px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-[14px] text-ink-2" style={{ opacity: easeOut(explore * 2) }}>
          Hover or focus a token to see its ID. A different model would split this text differently.
        </p>
      </div>
    </StageFrame>
  );
}

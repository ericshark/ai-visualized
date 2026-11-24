"use client";

import { SourceBadge } from "@/components/SourceBadge";
import { TokenChip, showToken } from "@/components/TokenChip";
import type { StageProps } from "@/lessons/types";
import { cn } from "@/lib/utils";
import { beatAt, progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { candidatesFor, generationPlan, illustrativePieces } from "../generation";
import { Panel, StageFrame, easeOut, stagger } from "./shared";

export function GenerateStage({ run, beats, elapsed, reduced }: StageProps) {
  const ms = useStageTime(elapsed, reduced);
  const plan = generationPlan(run);
  const { tokens, slow, hasCandidates, measured } = plan;
  const pos = beatAt(beats, ms);

  const stepIndex = pos.id.startsWith("step") ? Number(pos.id.slice(4)) : -1;
  const inFast = pos.id === "fast";
  const inChunks = pos.id === "chunks";
  const q = stepIndex >= 0 ? progressOf(beats, pos.id, ms) : 0;

  // How many output tokens have been appended to the text so far.
  let appended = 0;
  if (stepIndex >= 0) appended = stepIndex + (q >= 0.72 ? 1 : 0);
  else if (inFast) appended = slow + Math.floor(progressOf(beats, "fast", ms) * (tokens.length - slow));
  else if (inChunks) appended = tokens.length;
  if (reduced) appended = tokens.length;

  const prompt = run.inputTokens?.tokens ?? illustrativePieces(run.prompt);
  const shownPrompt = prompt.slice(0, 10);
  const current = stepIndex >= 0 ? tokens[stepIndex] : undefined;
  const candidates = current ? candidatesFor(current) : [];
  const grow = easeOut(q / 0.4);
  const picked = q >= 0.45;

  const badge = hasCandidates ? (
    <SourceBadge kind={measured ? "observed" : "example"} label={measured ? "Measured probabilities" : "Example probabilities"} tip={measured ? "Probabilities returned by the model for your live request." : "Illustrative numbers chosen for this sample, not produced by a model."} />
  ) : (
    <SourceBadge kind="conceptual" label="Illustrative split" tip="Claude streamed text and reported totals. This animation uses illustrative pieces." />
  );

  return (
    <StageFrame badges={badge}>
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-2">{run.mode === "live" ? "Illustration of text growing" : "What the model reads"}</p>
          <div className="flex flex-wrap items-center gap-1">
            {shownPrompt.map((t, i) => (
              <TokenChip key={`p${i}`} text={t.text} index={i} size="sm" tabIndex={-1} className="opacity-60" />
            ))}
            {prompt.length > shownPrompt.length && <span className="px-1 text-ink-3">…</span>}
            {tokens.slice(0, appended).map((t, i) => (
              <TokenChip key={`o${i}`} text={t.text} index={i + shownPrompt.length} size="sm" tabIndex={-1} className={cn(i === appended - 1 && !inChunks && "ring-2 ring-accent/40")} />
            ))}
            {!inChunks && appended < tokens.length && (
              <span aria-hidden className="ml-0.5 flex h-6 items-center rounded-md border border-dashed border-accent bg-accent-soft px-2 font-mono text-[12px] text-accent-strong">
                next?
              </span>
            )}
          </div>
        </div>

        <Panel tone="dashed" className="flex min-h-[220px] flex-1 flex-col justify-center">
          {pos.id === "intro" && (
            <p className="text-center text-[15px] text-ink-2">
              The model reads everything so far and predicts the single next token. Then it does it again.
            </p>
          )}

          {stepIndex >= 0 && candidates.length > 0 && (
            <div>
              <h3 className="mb-3 text-[13px] font-semibold text-ink-2">
                Token {stepIndex + 1}: how likely is each option?
              </h3>
              <ul className="space-y-2.5">
                {candidates.map((c, i) => {
                  const isChosen = c.token === current?.text;
                  const t = easeOut(stagger(grow, i, candidates.length, 2));
                  return (
                    <li key={c.token + i} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 sm:grid-cols-[7rem_1fr_3rem]">
                      <span className={cn("truncate rounded-md border px-2 py-0.5 text-center font-mono text-[13px] whitespace-pre", picked && isChosen ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink")}>
                        {showToken(c.token)}
                      </span>
                      <span className="h-3 overflow-hidden rounded-full bg-line">
                        <span
                          className={cn("block h-full rounded-full transition-colors duration-300", picked ? (isChosen ? "bg-accent" : "bg-ink-3/40") : "bg-accent/70")}
                          style={{ width: `${c.p * 100 * t}%` }}
                        />
                      </span>
                      <span className="text-right font-mono text-[13px] text-ink-2">{Math.round(c.p * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 min-h-5 text-[14px] text-ink-2">
                {picked ? (
                  <>
                    Picked <span className="font-mono text-ink">{showToken(current!.text)}</span>
                    {candidates[0]?.token !== current!.text && ", not the most likely option. Sampling allows variety."}
                  </>
                ) : (
                  "The model scores every option."
                )}
              </p>
            </div>
          )}

          {stepIndex >= 0 && candidates.length === 0 && current && (
            <p className="text-center text-[15px] text-ink-2">
              {picked ? (
                <>
                  {run.mode === "live" ? "Illustrative piece " : "Picked "}<span className="rounded border border-accent bg-accent px-1.5 py-0.5 font-mono text-white">{showToken(current.text)}</span>
                  <span className="mt-2 block text-[13.5px] text-ink-3">Claude provides the answer as text and reports token totals.</span>
                </>
              ) : (
                "Building the answer one piece at a time…"
              )}
            </p>
          )}

          {inFast && <p className="text-center text-[15px] text-ink-2">…and so on, one token at a time, until the model predicts the answer is finished.</p>}

          {inChunks && (
            <div>
              <h3 className="mb-3 text-[13px] font-semibold text-ink-2">
                {run.mode === "live" ? `The browser received ${run.chunks.length} text updates` : `${tokens.length} sample tokens arrived in ${run.chunks.length} network chunks`}
              </h3>
              <div className="flex max-h-[240px] flex-wrap gap-1.5 overflow-auto">
                {run.chunks.map((chunk, i) => {
                  const t = easeOut(stagger(progressOf(beats, "chunks", ms) * 1.6, i, run.chunks.length, 3));
                  return (
                    <div key={i} className="flex max-w-full flex-wrap gap-px rounded-lg border border-accent-line bg-accent-soft/50 p-1" style={{ opacity: t, transform: `translateY(${(1 - t) * 6}px)` }}>
                      {(chunk.tokens ?? [{ text: chunk.text }]).map((tok, k) => (
                        <span key={k} className="rounded-[5px] bg-surface px-1 font-mono text-[11.5px] break-all whitespace-pre-wrap text-ink">
                          {showToken(tok.text)}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[14px] text-ink-2">One text update can carry multiple tokens or part of a word.</p>
            </div>
          )}
        </Panel>

        <div>
          <p className="mb-1 text-[13px] font-medium text-ink-2">Answer so far</p>
          <p className="min-h-[3.2rem] text-[16px] leading-relaxed text-ink">
            {tokens
              .slice(0, appended)
              .map((t) => t.text)
              .join("")}
          </p>
        </div>
      </div>
    </StageFrame>
  );
}

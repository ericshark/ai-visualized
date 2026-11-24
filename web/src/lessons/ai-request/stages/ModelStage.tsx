"use client";

import { useSyncExternalStore } from "react";
import { SourceBadge } from "@/components/SourceBadge";
import { showToken } from "@/components/TokenChip";
import { outputTokens } from "@/execution/runReducer";
import type { StageProps } from "@/lessons/types";
import { progressOf } from "@/player/timeline";
import { useStageTime } from "@/player/useStageTime";
import { MODEL_PHASES } from "../content";
import { candidatesFor, illustrativePieces } from "../generation";
import { StageFrame, easeInOut, easeOut, lerp, seeded, stagger } from "./shared";

const NARROW = "(max-width: 639px)";

function useNarrow() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(NARROW);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

const BAND_H = 46;
const CELL_H = 10;
const CELL_GAP = 4;
const LAYERS = 3;

/** How bright a cell is. Seeded by the token, so every replay looks the same. */
const level = (id: number, layer: number, k: number) => 0.22 + 0.78 * seeded(id * 7 + layer * 131 + k * 17);

interface Column {
  text: string;
  id: number;
  tint: number;
}

export function ModelStage({ run, beats, elapsed, reduced }: StageProps) {
  const narrow = useNarrow();
  const ms = useStageTime(elapsed, reduced);
  const p = (id: string) => progressOf(beats, id, ms);

  const W = narrow ? 340 : 720;
  const H = narrow ? 430 : 400;
  const max = narrow ? 5 : 8;

  const input = run.inputTokens?.tokens ?? illustrativePieces(run.prompt);
  const source = input.length ? input : [{ text: run.prompt, id: 1 }];
  const columns: Column[] =
    source.length > max
      ? [
          ...source.slice(0, max - 2).map((t, i) => ({ text: t.text, id: t.id ?? i + 1, tint: i })),
          { text: "…", id: 9999, tint: max - 2 },
          { text: source[source.length - 1].text, id: source[source.length - 1].id ?? 77, tint: source.length - 1 },
        ]
      : source.map((t, i) => ({ text: t.text, id: t.id ?? i + 1, tint: i }));
  const n = columns.length;
  const colW = W / n;
  const x = (i: number) => colW * (i + 0.5);
  const last = n - 1;
  const cellW = Math.min(28, colW * 0.46);

  const embedTop = H - 112;
  const bandTop = (l: number) => H - 205 - l * 65;
  const slotTop = bandTop(LAYERS - 1) - 48;
  const cellsTop = (top: number, count: number) => top + (BAND_H - (count * CELL_H + (count - 1) * CELL_GAP)) / 2;

  const embed = p("embed");
  const layerP = Array.from({ length: LAYERS }, (_, l) => p(`layer${l}`));
  const predict = easeInOut(p("predict"));
  const phase = predict > 0 || p("layer2") >= 1 ? 2 : layerP[0] > 0 ? 1 : 0;

  const first = outputTokens(run)[0];
  const candidates = first ? candidatesFor(first) : [];

  const badges = (
    <>
      <SourceBadge kind="conceptual" />
      {predict > 0 && candidates.length > 0 && (
        <SourceBadge kind="example" label="Example scores" />
      )}
    </>
  );

  return (
    <StageFrame badges={badges}>
      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="Phases of the simulation">
        {MODEL_PHASES.map((item, i) => (
          <li
            key={item.label}
            className={`rounded-lg border px-2.5 py-2 text-[12.5px] leading-tight transition-colors duration-300 sm:text-[13.5px] ${
              i === phase ? "border-accent-line bg-accent-soft text-accent-strong" : "border-line text-ink-3"
            }`}
          >
            <span className="font-medium">{i + 1}</span> {item.label}
          </li>
        ))}
      </ol>

      <div className="flex flex-1 flex-col gap-5">
        <div>
          <div className="relative mx-auto w-full max-w-[720px]" style={{ aspectRatio: `${W} / ${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" fill="none" role="img" aria-label="Simulated diagram: tokens become numbers, pass through three layers, and produce a score for the next token">
              {/* layer bands */}
              {Array.from({ length: LAYERS }, (_, l) => {
                const q = layerP[l];
                const active = q > 0 && q < 1;
                return (
                  <rect
                    key={l}
                    x={6}
                    y={bandTop(l)}
                    width={W - 12}
                    height={BAND_H}
                    rx={12}
                    fill={active ? "var(--accent-soft)" : "var(--surface-2)"}
                    stroke={active ? "var(--accent)" : q >= 1 ? "var(--accent-line)" : "var(--line-2)"}
                    strokeDasharray="5 4"
                    strokeWidth={active ? 1.6 : 1.2}
                    style={{ transition: "fill 250ms, stroke 250ms" }}
                  />
                );
              })}

              {/* connectors between rows */}
              {columns.map((c, i) => (
                <g key={`conn-${i}`} stroke="var(--line-2)" strokeWidth={1.2} strokeDasharray="2 3" opacity={0.9}>
                  <line x1={x(i)} y1={H - 44} x2={x(i)} y2={embedTop + 60} opacity={easeOut(stagger(embed, i, n, 3))} />
                  <line x1={x(i)} y1={embedTop - 2} x2={x(i)} y2={bandTop(0) + BAND_H} opacity={embed >= 1 ? 1 : 0} />
                  {[0, 1].map((l) => (
                    <line key={l} x1={x(i)} y1={bandTop(l)} x2={x(i)} y2={bandTop(l + 1) + BAND_H} opacity={layerP[l + 1] > 0 ? 1 : 0} />
                  ))}
                </g>
              ))}

              {/* embeddings */}
              {columns.map((c, i) => {
                const t = easeOut(stagger(embed, i, n, 3));
                return (
                  <g key={`emb-${i}`} style={{ transform: `translateY(${(1 - t) * 22}px)` }}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <rect
                        key={k}
                        x={x(i) - cellW / 2}
                        y={embedTop + k * (CELL_H - 1 + CELL_GAP - 3)}
                        width={cellW}
                        height={CELL_H - 1}
                        rx={3}
                        fill={`var(--tok-${(c.tint % 6) + 1}-line)`}
                        opacity={t * level(c.id, -1, k)}
                      />
                    ))}
                  </g>
                );
              })}

              {/* layer states */}
              {Array.from({ length: LAYERS }, (_, l) =>
                columns.map((c, i) => {
                  const q = easeInOut(layerP[l]);
                  if (layerP[l] <= 0) return null;
                  return (
                    <g key={`cell-${l}-${i}`}>
                      {[0, 1, 2].map((k) => (
                        <rect
                          key={k}
                          x={x(i) - cellW / 2}
                          y={cellsTop(bandTop(l), 3) + k * (CELL_H + CELL_GAP)}
                          width={cellW}
                          height={CELL_H}
                          rx={3}
                          fill={`var(--tok-${(c.tint % 6) + 1}-line)`}
                          opacity={lerp(level(c.id, l - 1, k), level(c.id, l, k), q)}
                        />
                      ))}
                    </g>
                  );
                }),
              )}

              {/* context: the newest token reaches back to the earlier ones */}
              {Array.from({ length: LAYERS }, (_, l) =>
                layerP[l] > 0
                  ? columns.slice(0, last).map((_, i) => {
                      const mid = bandTop(l) + BAND_H / 2;
                      const bulge = Math.min(20, 6 + (last - i) * 3.2);
                      const t = easeOut(stagger(layerP[l], last - 1 - i, last, 2.5));
                      return (
                        <path
                          key={`arc-${l}-${i}`}
                          d={`M ${x(last)} ${mid} Q ${(x(last) + x(i)) / 2} ${mid - bulge * 2} ${x(i)} ${mid}`}
                          stroke="var(--accent)"
                          strokeWidth={1.4}
                          strokeDasharray="3 3"
                          opacity={0.7 * t}
                        />
                      );
                    })
                  : null,
              )}

              {/* prediction slot above the newest token */}
              <line x1={x(last)} y1={bandTop(LAYERS - 1)} x2={x(last)} y2={slotTop + 26} stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="3 3" opacity={predict} />
              <rect
                x={x(last) - 22}
                y={slotTop}
                width={44}
                height={26}
                rx={8}
                fill="var(--accent-soft)"
                stroke="var(--accent)"
                strokeDasharray="4 3"
                strokeWidth={1.4}
                opacity={0.3 + 0.7 * predict}
              />
              {[0, 1, 2, 3].map((k) => (
                <rect key={k} x={x(last) - 15 + k * 8} y={slotTop + 20 - 4 - predict * (4 + seeded(k + 3) * 10)} width={6} height={4 + predict * (4 + seeded(k + 3) * 10)} rx={1.5} fill="var(--accent)" opacity={predict} />
              ))}
            </svg>

            {/* token labels, aligned with the columns */}
            {columns.map((c, i) => (
              <span
                key={i}
                className="absolute bottom-0 -translate-x-1/2 truncate rounded-md border px-1.5 py-1 text-center font-mono text-[11px] leading-none whitespace-pre text-ink sm:text-[13px]"
                style={{
                  left: `${(x(i) / W) * 100}%`,
                  maxWidth: `${(colW / W) * 100 - 1}%`,
                  background: `var(--tok-${(c.tint % 6) + 1})`,
                  borderColor: `var(--tok-${(c.tint % 6) + 1}-line)`,
                }}
              >
                {showToken(c.text)}
              </span>
            ))}
          </div>

          <p className="mt-3 min-h-11 text-[14px] leading-snug text-ink-2">{MODEL_PHASES[phase].caption}</p>
          <p className="text-[12.5px] text-ink-3">A simulation. The API does not reveal what happens inside the model.</p>
        </div>

        {/* next-token scores */}
        <div className="rounded-xl border border-dashed border-line-2 bg-surface-2/50 p-3.5" style={{ opacity: 0.35 + 0.65 * predict }}>
          <h3 className="mb-3 text-[13px] font-semibold text-ink-2">Likely next tokens</h3>
          {candidates.length > 0 ? (
            <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {candidates.map((c, i) => {
                const t = easeOut(stagger(predict, i, candidates.length, 2));
                return (
                  <li key={c.token + i}>
                    <div className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="truncate font-mono whitespace-pre text-ink">{showToken(c.token)}</span>
                      <span className="font-mono text-ink-2">{Math.round(c.p * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${c.p * 100 * t}%`, opacity: i === 0 ? 1 : 0.55 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13.5px] leading-snug text-ink-2">
              The model scores every token in its vocabulary. This model did not return the scores, so they are not shown.
            </p>
          )}
        </div>
      </div>
    </StageFrame>
  );
}

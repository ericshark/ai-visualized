import type { RunState } from "@/execution/runReducer";
import type { Beat } from "@/player/timeline";
import type { Lesson, RailSpec, StageDefinition } from "../types";
import { COPY, MENTAL_MODEL, TAKEAWAYS } from "./content";
import { generateBeats, returnBeats } from "./generation";
import { BackendStage } from "./stages/BackendStage";
import { GenerateStage } from "./stages/GenerateStage";
import { ModelStage } from "./stages/ModelStage";
import { ProviderStage } from "./stages/ProviderStage";
import { RecapStage } from "./stages/RecapStage";
import { ReturnStage } from "./stages/ReturnStage";
import { SendStage } from "./stages/SendStage";
import { TokensStage } from "./stages/TokensStage";

const fixed = (...pairs: [string, number][]): Beat[] => pairs.map(([id, duration]) => ({ id, duration }));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const settled = (run: RunState) => run.status === "done";

const ALL: RailSpec["active"] = ["browser", "backend", "provider", "model"];

type Extras = Pick<StageDefinition, "rail" | "beats" | "ready" | "waitingFor" | "Visual">;

const extras: Extras[] = [
  {
    rail: () => ({ active: ["browser"] }),
    beats: (run) =>
      fixed(
        ["type", clamp(run.prompt.length * 45, 900, 2400)],
        ["press", 600],
        ["bubble", 700],
        ["fold", 1000],
        ["fields", 2000],
        ["hold", 1400],
      ),
    ready: (run) => !!run.request,
    waitingFor: "the request",
    Visual: SendStage,
  },
  {
    rail: () => ({ active: ["browser", "backend"], travel: { from: "browser", to: "backend", beat: "travel" } }),
    beats: () => fixed(["travel", 1800], ["checks", 2800], ["prepare", 2200], ["hold", 1000]),
    ready: (run) => !!run.validated,
    waitingFor: "the app server",
    Visual: BackendStage,
  },
  {
    rail: () => ({ active: ["backend", "provider"], travel: { from: "backend", to: "provider", beat: "travel" } }),
    beats: () => fixed(["travel", 1800], ["unpack", 2800], ["model", 1600], ["hold", 1000]),
    ready: (run) => !!run.provider,
    waitingFor: "the AI provider",
    Visual: ProviderStage,
  },
  {
    rail: () => ({ active: ["provider", "model"] }),
    beats: () => fixed(["show", 1400], ["split", 2400], ["ids", 1800], ["explore", 3000]),
    ready: (run) => Boolean(run.inputTokens),
    waitingFor: "the tokens",
    Visual: TokensStage,
  },
  {
    rail: () => ({ active: ["model"] }),
    beats: () => fixed(["embed", 3000], ["layer0", 1700], ["layer1", 1700], ["layer2", 1700], ["predict", 3200]),
    ready: (run) => Boolean(run.inputTokens),
    waitingFor: "the tokens",
    Visual: ModelStage,
  },
  {
    rail: () => ({ active: ["model"] }),
    beats: generateBeats,
    ready: settled,
    waitingFor: "the answer",
    Visual: GenerateStage,
  },
  {
    rail: (run) => ({ active: ALL, returning: { times: run.chunks.map((c) => c.t), travelMs: 700 } }),
    beats: returnBeats,
    ready: settled,
    waitingFor: "the answer",
    Visual: ReturnStage,
  },
  {
    rail: () => ({ active: ALL }),
    beats: () => fixed(["zoom", 2400], ["summary", 1200]),
    ready: () => true,
    waitingFor: "",
    Visual: RecapStage,
  },
];

export const aiRequestLesson: Lesson = {
  id: "ai-request",
  title: "What happens when you ask AI a question?",
  stages: COPY.map((copy, i) => ({ ...copy, ...extras[i] })),
  takeaways: TAKEAWAYS,
  mentalModel: MENTAL_MODEL,
};

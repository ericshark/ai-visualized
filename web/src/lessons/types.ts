import type { ComponentType } from "react";
import type { MotionValue } from "motion/react";
import type { StageId } from "@/execution/events";
import type { RunState } from "@/execution/runReducer";
import type { Beat } from "@/player/timeline";

export type NodeId = "browser" | "backend" | "provider" | "model";

/** What the journey rail shows during a stage. */
export interface RailSpec {
  /** Nodes that are lit during this stage. */
  active: NodeId[];
  /** A packet travelling between two nodes during a named beat. */
  travel?: { from: NodeId; to: NodeId; beat: string };
  /** Chunks flowing from the model back to the browser. */
  returning?: { times: number[]; travelMs: number };
}

export type DeeperBlock =
  | { kind: "text"; title: string; body: string }
  | { kind: "code"; title: string; code: string; caption?: string }
  | { kind: "facts"; title: string; items: { label: string; value: string }[] };

/** Everything a stage visualization needs. Visualizations contain no lesson copy. */
export interface StageProps {
  run: RunState;
  beats: Beat[];
  /** Milliseconds into the stage. Read it with useStageTime. */
  elapsed: MotionValue<number>;
  reduced: boolean;
  goTo: (stage: number) => void;
  onReplay: () => void;
  onAskAnother: () => void;
}

export interface StageDefinition {
  id: StageId;
  title: string;
  /** Label for the progress bar. */
  short: string;
  /** What is happening, in one or two plain sentences. */
  simple: string;
  /** Why it happens. */
  why: string;
  /** What changes as a result. */
  changes: string;
  rail: (run: RunState, beats: Beat[]) => RailSpec;
  beats: (run: RunState) => Beat[];
  /** True once the run has produced the data this stage shows. */
  ready: (run: RunState) => boolean;
  /** What playback is waiting for while `ready` is false. */
  waitingFor: string;
  deeper: (run: RunState) => DeeperBlock[];
  Visual: ComponentType<StageProps>;
}

export interface Lesson {
  id: string;
  title: string;
  stages: StageDefinition[];
  /** One line per stage, shown in the recap. */
  takeaways: string[];
  mentalModel: string;
}

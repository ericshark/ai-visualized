/** A timed step inside a stage. */
export interface Beat {
  id: string;
  /** Milliseconds. */
  duration: number;
}

export interface StageTiming {
  beats: Beat[];
  /**
   * Playback holds here (ms into the stage) until the run has settled, so a
   * stage never shows an answer that has not arrived yet.
   */
  gateAt?: number;
}

export interface BeatPosition {
  index: number;
  id: string;
  /** 0..1 progress through the current beat. */
  progress: number;
}

export function stageDuration(beats: Beat[]): number {
  return beats.reduce((sum, b) => sum + b.duration, 0);
}

export function beatStart(beats: Beat[], id: string): number {
  let t = 0;
  for (const beat of beats) {
    if (beat.id === id) return t;
    t += beat.duration;
  }
  throw new Error(`Unknown beat "${id}"`);
}

export function beatAt(beats: Beat[], elapsed: number): BeatPosition {
  if (beats.length === 0) return { index: 0, id: "", progress: 1 };
  let start = 0;
  for (let i = 0; i < beats.length; i++) {
    const end = start + beats[i].duration;
    if (elapsed < end) {
      const progress = beats[i].duration ? (elapsed - start) / beats[i].duration : 1;
      return { index: i, id: beats[i].id, progress: Math.max(0, progress) };
    }
    start = end;
  }
  const last = beats.length - 1;
  return { index: last, id: beats[last].id, progress: 1 };
}

/** Progress (0..1) through a named beat at a given time in the stage. */
export function progressOf(beats: Beat[], id: string, elapsed: number): number {
  const start = beatStart(beats, id);
  const beat = beats.find((b) => b.id === id)!;
  if (beat.duration === 0) return elapsed >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (elapsed - start) / beat.duration));
}

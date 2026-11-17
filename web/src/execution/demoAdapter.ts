import { browserScheduler, type ExecutionAdapter, type Scheduler } from "./adapter";
import { stamp, type UnstampedEvent } from "./events";

export interface Fixture {
  id: string;
  prompt: string;
  events: UnstampedEvent[];
}

/**
 * Plays a recorded run back at its recorded timing. Deterministic: the same
 * fixture always produces the same events at the same offsets.
 */
export function createDemoAdapter(
  fixtures: Fixture[],
  scheduler: Scheduler = browserScheduler,
): ExecutionAdapter {
  return {
    start({ runId, exampleId }, onEvent) {
      const fixture = fixtures.find((f) => f.id === exampleId) ?? fixtures[0];
      let cancelled = false;
      const handles = fixture.events.map((raw) =>
        scheduler.setTimeout(() => {
          if (!cancelled) onEvent(stamp(raw, runId, "demo"));
        }, raw.t),
      );

      return () => {
        if (cancelled) return;
        cancelled = true;
        handles.forEach((h) => scheduler.clearTimeout(h));
        onEvent(
          stamp({ type: "cancelled", t: 0, stage: "return", payload: {} }, runId, "demo"),
        );
      };
    },
  };
}

import { describe, expect, it, vi } from "vitest";
import type { Scheduler } from "./adapter";
import { createDemoAdapter, type Fixture } from "./demoAdapter";
import { stamp, type AnyRunEvent, type UnstampedEvent } from "./events";
import { createLiveAdapter } from "./liveAdapter";
import { initialRun, isSettled, outputTokens, runReducer, type RunState } from "./runReducer";
import { createSseParser } from "./sse";

const raw = {
  delta: (t: number, text: string): UnstampedEvent => ({
    type: "output.delta",
    t,
    stage: "return",
    payload: { text, tokens: [{ text, id: t }] },
  }),
  done: (t: number, text: string): UnstampedEvent => ({
    type: "output.done",
    t,
    stage: "return",
    payload: { text, probabilitiesMeasured: false },
  }),
};

function started(runId = "r1"): RunState {
  return runReducer(initialRun, { type: "start", runId, mode: "demo", prompt: "Hi" });
}

const apply = (state: RunState, ...events: AnyRunEvent[]) =>
  events.reduce((s, event) => runReducer(s, { type: "event", event }), state);

describe("runReducer", () => {
  it("accumulates streamed chunks and timing", () => {
    const s = apply(
      started(),
      stamp(raw.delta(300, "Hello"), "r1", "demo"),
      stamp(raw.delta(340, " there"), "r1", "demo"),
      stamp(raw.done(500, "Hello there"), "r1", "demo"),
    );
    expect(s.text).toBe("Hello there");
    expect(s.chunks).toHaveLength(2);
    expect(s.firstChunkMs).toBe(300);
    expect(s.totalMs).toBe(500);
    expect(s.status).toBe("done");
    expect(outputTokens(s).map((t) => t.text)).toEqual(["Hello", " there"]);
  });

  it("ignores events from a superseded run", () => {
    const s = apply(started("new"), stamp(raw.delta(10, "stale"), "old", "demo"));
    expect(s.text).toBe("");
    expect(s.events).toHaveLength(0);
  });

  it("ignores events after the run has settled", () => {
    const s = apply(
      started(),
      stamp(raw.done(100, "Done"), "r1", "demo"),
      stamp(raw.delta(120, " late"), "r1", "demo"),
    );
    expect(s.text).toBe("Done");
  });

  it("records errors and cancellation as settled states", () => {
    const failed = apply(
      started(),
      stamp({ type: "error", t: 5, stage: "return", payload: { message: "x", code: "c", retryable: true } }, "r1", "observed"),
    );
    expect(failed.status).toBe("error");
    expect(isSettled(failed)).toBe(true);

    const cancelled = apply(started(), stamp({ type: "cancelled", t: 5, stage: "return", payload: {} }, "r1", "demo"));
    expect(cancelled.status).toBe("cancelled");
  });

  it("marks live runs as observed data", () => {
    const s = runReducer(initialRun, { type: "start", runId: "r", mode: "live", prompt: "Hi" });
    expect(s.source).toBe("observed");
  });
});

describe("createSseParser", () => {
  it("parses frames split across reads", () => {
    const push = createSseParser();
    expect(push('event: output.delta\ndata: {"a"')).toEqual([]);
    expect(push(':1}\n\nevent: output.done\r\ndata: {}\r\n\r\n')).toEqual([
      { event: "output.delta", data: '{"a":1}' },
      { event: "output.done", data: "{}" },
    ]);
  });

  it("skips comments and joins multi-line data", () => {
    const push = createSseParser();
    expect(push(": keep-alive\n\ndata: one\ndata: two\n\n")).toEqual([{ event: "message", data: "one\ntwo" }]);
  });
});

function fakeScheduler() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 0;
  const scheduler: Scheduler = {
    setTimeout: (fn, ms) => {
      timers.push({ at: now + ms, fn, id: ++nextId });
      return nextId;
    },
    clearTimeout: (id) => {
      timers = timers.filter((t) => t.id !== id);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
    timers = timers.filter((t) => t.at > now);
    due.forEach((t) => t.fn());
  };
  return { scheduler, advance };
}

describe("createDemoAdapter", () => {
  const fixture: Fixture = {
    id: "ex",
    prompt: "Hi",
    events: [raw.delta(100, "Hel"), raw.delta(200, "lo"), raw.done(300, "Hello")],
  };

  it("plays a fixture at its recorded offsets", () => {
    const { scheduler, advance } = fakeScheduler();
    const seen: AnyRunEvent[] = [];
    createDemoAdapter([fixture], scheduler).start({ runId: "r1", prompt: "Hi", exampleId: "ex" }, (e) => seen.push(e));

    advance(150);
    expect(seen.map((e) => e.type)).toEqual(["output.delta"]);
    advance(200);
    expect(seen.map((e) => e.type)).toEqual(["output.delta", "output.delta", "output.done"]);
    expect(seen.every((e) => e.runId === "r1" && e.source === "demo")).toBe(true);
  });

  it("stops emitting after cancellation", () => {
    const { scheduler, advance } = fakeScheduler();
    const seen: AnyRunEvent[] = [];
    const cancel = createDemoAdapter([fixture], scheduler).start({ runId: "r1", prompt: "Hi" }, (e) => seen.push(e));
    advance(150);
    cancel();
    cancel();
    advance(1000);
    expect(seen.map((e) => e.type)).toEqual(["output.delta", "cancelled"]);
  });
});

function streamOf(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
}

async function collect(fetchImpl: typeof fetch) {
  const seen: AnyRunEvent[] = [];
  let clock = 0;
  createLiveAdapter({ baseUrl: "http://api", fetch: fetchImpl, now: () => (clock += 10) }).start(
    { runId: "live", prompt: "Hi" },
    (e) => seen.push(e),
  );
  await vi.waitFor(() => expect(seen.some((e) => e.type === "output.done" || e.type === "error")).toBe(true));
  return seen;
}

describe("createLiveAdapter", () => {
  it("emits the browser request, then server events as observed data", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        streamOf([
          'event: backend.received\ndata: {"payload":{"endpoint":"/api/chat/stream","method":"POST"}}\n\n',
          'event: output.delta\ndata: {"payload":{"text":"Hi"}}\n\nevent: output.done\n',
          'data: {"payload":{"text":"Hi","probabilitiesMeasured":false}}\n\n',
        ]),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const seen = await collect(fetchImpl);
    expect(seen.map((e) => e.type)).toEqual(["request.created", "backend.received", "output.delta", "output.done"]);
    expect(seen.every((e) => e.source === "observed")).toBe(true);
    expect(seen[0].t).toBe(0);
    expect(seen[2].t).toBeGreaterThan(0);
  });

  it("turns an HTTP error into a readable error event", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ detail: "Your message is too long." }), { status: 422 })) as unknown as typeof fetch;
    const seen = await collect(fetchImpl);
    const error = seen.at(-1)!;
    expect(error.type).toBe("error");
    expect(error.type === "error" && error.payload.message).toBe("Your message is too long.");
  });

  it("reports a network failure", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const seen = await collect(fetchImpl);
    expect(seen.at(-1)).toMatchObject({ type: "error", payload: { code: "network" } });
  });

  it("reports a stream that ends without a final event", async () => {
    const fetchImpl = (async () =>
      new Response(streamOf(['event: output.delta\ndata: {"payload":{"text":"Hi"}}\n\n']), { status: 200 })) as unknown as typeof fetch;
    const seen = await collect(fetchImpl);
    expect(seen.at(-1)).toMatchObject({ type: "error", payload: { code: "incomplete" } });
  });

  it("emits one cancelled event and nothing after it", async () => {
    let release: () => void = () => {};
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        release = () => reject(new DOMException("aborted", "AbortError"));
        init.signal?.addEventListener("abort", () => release());
      })) as unknown as typeof fetch;

    const seen: AnyRunEvent[] = [];
    const cancel = createLiveAdapter({ baseUrl: "http://api", fetch: fetchImpl }).start(
      { runId: "live", prompt: "Hi" },
      (e) => seen.push(e),
    );
    cancel();
    cancel();
    await new Promise((r) => setTimeout(r, 10));
    expect(seen.map((e) => e.type)).toEqual(["request.created", "cancelled"]);
  });
});

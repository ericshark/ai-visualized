import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSseParser } from "@/execution/sse";
import { GET } from "../../health/route";
import { POST } from "./route";

vi.mock("next/server", () => ({ connection: async () => {} }));

const key = "test-private-claude-key";
const url = "https://lesson.example/api/chat/stream";

function request(body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://lesson.example" },
    body: JSON.stringify(body),
  });
}

function providerEvent(event: string, data: unknown) {
  return `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
}

describe("Claude Live routes", () => {
  const provider = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("CLAUDE_API_KEY", key);
    vi.stubGlobal("fetch", provider);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    provider.mockReset();
  });

  it("reports configuration without exposing the key and supports Sample-only deployments", async () => {
    const available = await GET();
    expect(await available.json()).toEqual({
      liveAvailable: true, model: "claude-haiku-5-5", provider: "Anthropic", maxInputChars: 500,
    });
    vi.stubEnv("CLAUDE_API_KEY", "");
    expect(await (await GET()).json()).toMatchObject({ liveAvailable: false });
    expect((await POST(request({ prompt: "Hello" }))).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([{}, { prompt: "" }, { prompt: 123 }, { prompt: "x".repeat(501) }, { prompt: "Hi", extra: "x".repeat(4096) }])(
    "rejects invalid input before contacting Claude",
    async (body) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(provider).not.toHaveBeenCalled();
    },
  );

  it("normalizes fragmented Claude events into text, usage and timings", async () => {
    const wire = [
      providerEvent("message_start", { message: { usage: { input_tokens: 19 } } }),
      providerEvent("content_block_delta", { delta: { type: "text_delta", text: "Café" } }),
      providerEvent("content_block_delta", { delta: { type: "text_delta", text: " time." } }),
      providerEvent("message_delta", { usage: { output_tokens: 4 }, delta: { stop_reason: "end_turn" } }),
      providerEvent("message_stop", {}),
    ].join("");
    const bytes = new TextEncoder().encode(wire);
    provider.mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    })));

    const response = await POST(request({ prompt: "  Hello  ", model: "ignored" }));
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text).not.toContain(key);

    const frames = createSseParser()(text);
    expect(frames.map(({ event }) => event)).toEqual([
      "backend.received", "backend.validated", "provider.request", "output.delta", "output.delta", "output.done",
    ]);
    expect(JSON.parse(frames.at(-1)!.data).payload).toMatchObject({
      text: "Café time.",
      usage: { inputTokens: 19, outputTokens: 4 },
      finishReason: "end_turn",
      probabilitiesMeasured: false,
      serverMs: { firstToken: expect.any(Number), total: expect.any(Number) },
    });
    const [target, options] = provider.mock.calls[0];
    expect(target).toBe("https://api.anthropic.com/v1/messages");
    expect(new Headers(options?.headers).get("x-api-key")).toBe(key);
    expect(JSON.parse(String(options?.body))).toMatchObject({
      model: "claude-haiku-5-5", max_tokens: 256, thinking: { type: "disabled" },
      messages: [{ role: "user", content: "Hello" }],
    });
  });

  it("sanitizes provider errors and identifies incomplete responses", async () => {
    provider.mockResolvedValueOnce(new Response(`Provider echoed ${key}`, { status: 401 }));
    provider.mockResolvedValueOnce(new Response(providerEvent("message_start", {})));
    const response = await (await POST(request({ prompt: "Hello" }))).text();
    expect(response).not.toContain(key);
    expect(response).toContain('"code":"unavailable"');
    const incomplete = await (await POST(request({ prompt: "Hello" }))).text();
    expect(incomplete).toContain('"code":"incomplete"');
    expect(incomplete).not.toContain("event: output.done");
  });

  it("aborts the provider when the client cancels the response", async () => {
    provider.mockImplementation(async (_url, options) => new Response(new ReadableStream({
      start(controller) {
        options?.signal?.addEventListener("abort", () => controller.error(options.signal?.reason), { once: true });
      },
    })));
    const response = await POST(request({ prompt: "Hello" }));
    const reader = response.body!.getReader();
    await reader.read();
    await reader.read();
    await reader.read();
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));
    await reader.cancel();
    expect(provider.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

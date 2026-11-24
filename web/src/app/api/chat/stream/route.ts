import type { EventType, Payloads } from "@/execution/events";
import { createSseParser } from "@/execution/sse";
import { claudeKey, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS, MODEL, PROVIDER, TIMEOUT_MS } from "../../liveConfig";

const PATH = "/api/chat/stream";
const MAX_BODY_BYTES = 4096;
const INSTRUCTIONS = "Answer the question directly in plain text. Use a few short sentences and clear language suitable for a general audience.";
const encoder = new TextEncoder();

function frame<K extends EventType>(type: K, payload: Payloads[K]) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify({ payload })}\n\n`);
}

async function readPrompt(request: Request): Promise<string | undefined> {
  const reader = request.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return;
      }
      body += decoder.decode(value, { stream: true });
    }
    const data: unknown = JSON.parse(body + decoder.decode());
    if (!data || typeof data !== "object" || !("prompt" in data) || typeof data.prompt !== "string") return;
    const prompt = data.prompt.trim();
    if (prompt && prompt.length <= MAX_INPUT_CHARS) return prompt;
  } catch {
    return;
  } finally {
    reader.releaseLock();
  }
}

function problem(status: number, detail: string) {
  return Response.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

type ClaudeEvent = {
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: { output_tokens?: number };
  error?: { type?: string };
};

class ProviderError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = true) {
    super(message);
  }
}

async function* streamAnswer(prompt: string, apiKey: string, signal: AbortSignal, started: number) {
  const elapsed = () => Math.round(performance.now() - started);
  yield frame("backend.received", { endpoint: PATH, method: "POST" });
  yield frame("backend.validated", {
    promptChars: prompt.length,
    checks: [
      { id: "json", label: "JSON request", ok: true },
      { id: "prompt", label: "Message is present", ok: true },
      { id: "length", label: `Up to ${MAX_INPUT_CHARS} characters`, ok: true },
    ],
  });

  const payload = {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    thinking: { type: "disabled" },
    stream: true,
    system: INSTRUCTIONS,
    messages: [{ role: "user", content: prompt }],
  };
  yield frame("provider.request", {
    provider: PROVIDER,
    model: MODEL,
    settings: { "Max output tokens": MAX_OUTPUT_TOKENS, Thinking: "Off", Streaming: true },
    instructions: INSTRUCTIONS,
    preview: payload,
  });

  const deadline = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([signal, deadline]),
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      await response.body?.cancel();
      if (response.status === 429) throw new ProviderError("rate_limit", "Claude is receiving too many requests. Try again in a minute.");
      if ([400, 401, 402, 403, 404].includes(response.status)) {
        throw new ProviderError("unavailable", "Claude Live is temporarily unavailable. You can still try a sample.", false);
      }
      throw new ProviderError("provider", "Claude could not answer right now. Try again or use a sample.");
    }

    const parse = createSseParser();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let text = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let firstText: number | undefined;
    let finishReason: string | undefined;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const { event, data } of parse(decoder.decode(value, { stream: true }))) {
          const value: ClaudeEvent = JSON.parse(data);
          switch (event) {
            case "message_start":
              inputTokens = value.message?.usage?.input_tokens;
              break;
            case "content_block_delta": {
              const delta = value.delta;
              if (delta?.type !== "text_delta" || !delta.text) break;
              firstText ??= elapsed();
              text += delta.text;
              yield frame("output.delta", { text: delta.text });
              break;
            }
            case "message_delta":
              outputTokens = value.usage?.output_tokens ?? outputTokens;
              finishReason = value.delta?.stop_reason ?? finishReason;
              break;
            case "message_stop":
              yield frame("output.done", {
                text,
                usage: inputTokens !== undefined && outputTokens !== undefined ? { inputTokens, outputTokens } : null,
                finishReason,
                probabilitiesMeasured: false,
                serverMs: { firstToken: firstText, total: elapsed() },
              });
              return;
            case "error":
              if (value.error?.type === "rate_limit_error") {
                throw new ProviderError("rate_limit", "Claude is receiving too many requests. Try again in a minute.");
              }
              throw new ProviderError("provider", "Claude interrupted the answer. Try again or use a sample.");
          }
        }
      }
      throw new ProviderError("incomplete", "The connection closed before Claude finished answering. Try again or use a sample.");
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } catch (error) {
    if (signal.aborted) return;
    const issue = deadline.aborted
      ? new ProviderError("timeout", "Claude took too long to answer. Try a shorter question or use a sample.")
      : error instanceof ProviderError
        ? error
        : new ProviderError("connection", "The connection to Claude was interrupted. Try again or use a sample.");
    yield frame("error", { code: issue.code, message: issue.message, retryable: issue.retryable });
  }
}

export async function POST(request: Request) {
  const started = performance.now();
  const apiKey = claudeKey();
  if (!apiKey) return problem(503, "Claude Live is unavailable here. Try a sample instead.");

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return problem(403, "Send live questions from the lesson.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return problem(415, "Send the question as JSON.");
  }
  const prompt = await readPrompt(request);
  if (!prompt) return problem(400, `Enter a question between 1 and ${MAX_INPUT_CHARS} characters.`);

  const cancelled = new AbortController();
  const events = streamAnswer(prompt, apiKey, AbortSignal.any([request.signal, cancelled.signal]), started);
  const body = new ReadableStream({
    async pull(controller) {
      const next = await events.next();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
    async cancel() {
      cancelled.abort();
      await events.return(undefined);
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform" },
  });
}

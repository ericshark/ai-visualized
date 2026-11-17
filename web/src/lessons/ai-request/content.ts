/**
 * All the words of the lesson: stage copy, technical detail, takeaways.
 * Visualizations import nothing from here except node names and takeaways,
 * and contain no explanatory prose of their own.
 */

import type { StageId } from "@/execution/events";
import { outputTokens, type RunState } from "@/execution/runReducer";
import type { DeeperBlock, NodeId } from "../types";

export const NODES: Record<NodeId, { name: string; detail: string }> = {
  browser: { name: "Your browser", detail: "The app you type into, running on your device." },
  backend: { name: "App server", detail: "The app's own computer. It keeps the secret API key and the rules." },
  provider: { name: "AI provider", detail: "The company that hosts the model, reached through its API." },
  model: { name: "Model", detail: "The language model itself, running on the provider's hardware." },
};

export interface StageCopy {
  id: StageId;
  title: string;
  short: string;
  simple: string;
  why: string;
  changes: string;
  deeper: (run: RunState) => DeeperBlock[];
}

const seconds = (ms?: number | null) => (ms == null ? "n/a" : `${(ms / 1000).toFixed(2)} s`);
const json = (value: unknown) => JSON.stringify(value, null, 2);

export const COPY: StageCopy[] = [
  {
    id: "send",
    title: "You send a message",
    short: "Send",
    simple:
      "Your question is packaged into a request that an application can send over the internet.",
    why: "Computers only exchange data in agreed formats, so your words need a format and an address.",
    changes: "Your words are now data with a destination: the app's server.",
    deeper: (run) => {
      const r = run.request;
      return [
        {
          kind: "text",
          title: "An HTTP POST request",
          body:
            "The browser makes an HTTP request to the app's own server. POST means “here is some data for you to process”. The body is JSON, a plain-text format for structured data that almost every programming language can read.",
        },
        ...(r
          ? ([
              {
                kind: "code",
                title: "The request your browser sends",
                code: `${r.method} ${r.url} HTTP/1.1\n${Object.entries(r.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}\n\n${JSON.stringify(r.body)}`,
                caption: `${r.bytes} bytes of body. Your message is sent over HTTPS, so it is encrypted on the way.`,
              },
            ] satisfies DeeperBlock[])
          : []),
        {
          kind: "text",
          title: "Why not call the AI directly?",
          body:
            "The browser talks to the app's server, not to the AI provider. Calling the provider needs a secret API key, and anything shipped to a browser can be read by its user. Keeping the key on the server keeps it secret.",
        },
      ];
    },
  },
  {
    id: "backend",
    title: "The request travels to the backend",
    short: "Backend",
    simple:
      "The request crosses the internet to the app's server, which checks it and prepares it for the AI.",
    why: "The server is where the app keeps what users must not touch: its secret key, its instructions and its limits.",
    changes: "Your question is checked and wrapped with the app's instructions, settings and secret key.",
    deeper: (run) => [
      {
        kind: "text",
        title: "A FastAPI endpoint",
        body:
          "This app's backend is a small Python service built with FastAPI. One endpoint, POST /api/chat/stream, receives your question, validates it, and opens a streaming connection back to your browser.",
      },
      {
        kind: "code",
        title: "Simplified endpoint",
        code: `@app.post("/api/chat/stream")
async def chat_stream(body: ChatRequest, request: Request):
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(422, "Type a question first.")
    if len(prompt) > MAX_INPUT_CHARS:
        raise HTTPException(422, "Keep your question short.")
    if limiter.acquire(request.client.host):
        raise HTTPException(429, "Too many requests.")
    return StreamingResponse(events(prompt), media_type="text/event-stream")`,
      },
      {
        kind: "facts",
        title: "What the server checked",
        items: (run.validated?.checks ?? []).map((c) => ({ label: c.label, value: c.ok ? "Passed" : "Failed" })),
      },
      {
        kind: "text",
        title: "Protecting a paid API",
        body:
          "Every request to the model costs money. The server fixes the model, the instructions and the maximum answer length, and limits how many requests one connection can make. Without these checks, anyone could use the app's key for anything.",
      },
    ],
  },
  {
    id: "provider",
    title: "The AI provider receives the request",
    short: "Provider",
    simple:
      "The server forwards the request to the AI provider, which runs the model. The model sees only what is in this request.",
    why: "Models are very large and run on specialised hardware, so apps reach them through the provider's API.",
    changes: "The model now has its full context: the app's instructions plus your message.",
    deeper: (run) => {
      const p = run.provider;
      return [
        ...(p
          ? ([
              {
                kind: "code",
                title: `Request to ${p.provider}'s Responses API`,
                code: json(p.preview),
                caption: "The API key is sent in a header and is shown redacted. It never leaves the server.",
              },
              {
                kind: "facts",
                title: "Settings",
                items: [
                  { label: "Model", value: p.model },
                  ...Object.entries(p.settings).map(([k, v]) => ({ label: k, value: String(v) })),
                ],
              },
            ] satisfies DeeperBlock[])
          : []),
        {
          kind: "text",
          title: "No memory between requests",
          body:
            "The model does not remember earlier conversations. Chat apps that seem to remember resend the earlier messages with every request. This app sends only your single question and its instructions.",
        },
        {
          kind: "text",
          title: "Instructions you can see",
          body:
            "This app's instructions are shown in full. Many apps keep theirs private, which is why you usually cannot see everything a model was told.",
        },
      ];
    },
  },
  {
    id: "tokens",
    title: "Text becomes tokens",
    short: "Tokens",
    simple:
      "Before the model reads your message, it is split into tokens: common words, pieces of words and punctuation, each with an ID number.",
    why: "Models work with numbers, not letters. A fixed vocabulary of tokens turns any text into a list of IDs.",
    changes: "Your sentence is now a sequence of token IDs the model can process.",
    deeper: (run) => {
      const t = run.inputTokens;
      const blocks: DeeperBlock[] = [
        {
          kind: "text",
          title: "Tokenization depends on the model",
          body:
            "Each model family has its own vocabulary, often around 100,000 to 200,000 tokens. The same sentence can split differently for different models, which is also why prices and limits are counted in tokens rather than words.",
        },
      ];
      if (t) {
        blocks.push(
          {
            kind: "facts",
            title: "Your message",
            items: [
              { label: "Characters", value: String(run.prompt.length) },
              { label: "Tokens", value: String(t.tokens.length) },
              { label: "Tokenizer", value: t.encoding },
            ],
          },
          { kind: "code", title: "What the model receives as IDs", code: `[${t.tokens.map((x) => x.id).join(", ")}]` },
        );
        if (!t.exact) {
          blocks.push({
            kind: "text",
            title: "A close estimate",
            body: `These tokens come from ${t.encoding}, the tokenizer of OpenAI's GPT-4o and GPT-5 models. The tokenizer library does not list the configured model, so its exact boundaries may differ slightly.`,
          });
        }
      }
      const usage = run.done?.usage;
      if (usage && t) {
        blocks.push({
          kind: "text",
          title: "Why the provider counts more",
          body: `The provider counted ${usage.inputTokens} input tokens, not ${t.tokens.length}. The app's instructions and the formatting that separates messages are tokens too.`,
        });
      }
      return blocks;
    },
  },
  {
    id: "model",
    title: "Inside the model",
    short: "Model",
    simple:
      "Each token becomes a long list of numbers. Layer by layer, the model updates those numbers using the context, then scores every possible next token.",
    why: "A word's meaning depends on its neighbours, so each layer lets every token take in information from the tokens before it.",
    changes: "The model ends with a score for every token in its vocabulary: its prediction of what comes next.",
    deeper: () => [
      {
        kind: "text",
        title: "Embeddings",
        body:
          "Each token ID is looked up in a table and replaced by a vector, a list of thousands of numbers. Tokens used in similar ways end up with similar vectors.",
      },
      {
        kind: "text",
        title: "Transformer layers and attention",
        body:
          "A Transformer stacks dozens of layers. In each one, an attention step lets every position combine information from earlier positions, and a feed-forward step transforms the result. The last layer turns the final position's vector into a score for every token in the vocabulary.",
      },
      {
        kind: "text",
        title: "Inference, not training",
        body:
          "The model's billions of parameters were fixed during training, long before your question. Answering is called inference: the numbers flow through fixed weights. The model is not learning from your message.",
      },
      {
        kind: "text",
        title: "What this picture is not",
        body:
          "The API does not expose any of these internal numbers, so this animation is a simulation, not a recording. The numbers are not words or thoughts, and they differ for every input. Some models also write hidden reasoning before answering; providers usually do not show it, and this lesson cannot observe it.",
      },
    ],
  },
  {
    id: "generate",
    title: "The response is generated",
    short: "Generate",
    simple:
      "The model picks one token, adds it to the text, and predicts again. One token at a time, the answer grows.",
    why: "A language model only predicts the next token, so a long answer is many predictions in a row.",
    changes: "A full answer forms, token by token, until the model predicts that it is finished.",
    deeper: (run) => {
      const tokens = outputTokens(run);
      const measured = run.done?.probabilitiesMeasured;
      return [
        {
          kind: "text",
          title: "Autoregressive generation",
          body:
            "Each new token is appended to the input and the whole sequence goes through the model again. Providers cache earlier work so this stays fast, but every token is still its own prediction.",
        },
        {
          kind: "text",
          title: "Picking, not always the top choice",
          body:
            "The model outputs probabilities, and a sampling step picks from them. Picking only the most likely token tends to sound flat and repetitive, so a less likely token is sometimes chosen. That is one reason the same question can get different answers.",
        },
        {
          kind: "text",
          title: "Tokens are not network chunks",
          body:
            "The model produces tokens; the network carries chunks. This app's server merges tokens that arrive close together into one chunk to save overhead, so a chunk can hold several tokens.",
        },
        {
          kind: "facts",
          title: "This answer",
          items: [
            { label: "Output tokens", value: String(run.done?.usage?.outputTokens ?? (tokens.length || "n/a")) },
            { label: "Network chunks", value: String(run.chunks.length) },
            {
              label: "Probabilities",
              value: measured ? "Measured, from the model" : run.mode === "demo" ? "Example values" : "Not provided by the model",
            },
          ],
        },
      ];
    },
  },
  {
    id: "return",
    title: "The response returns",
    short: "Return",
    simple:
      "Chunks of the answer flow back through the app server to your browser as they are made, so words appear before the answer is finished.",
    why: "Streaming lets you start reading after the first chunk instead of waiting for the whole answer.",
    changes: "The complete answer is on your screen.",
    deeper: (run) => {
      const first = run.chunks.slice(0, 3);
      return [
        {
          kind: "text",
          title: "Server-Sent Events",
          body:
            "The server keeps the HTTP response open and writes events into it as they happen. Each event has a type and a JSON payload. The browser reads them as a stream instead of waiting for one big reply.",
        },
        ...(first.length
          ? ([
              {
                kind: "code",
                title: "The first chunks on the wire",
                code: first
                  .map((c) => `event: output.delta\ndata: ${JSON.stringify({ payload: { text: c.text } })}`)
                  .join("\n\n"),
              },
            ] satisfies DeeperBlock[])
          : []),
        {
          kind: "facts",
          title: run.mode === "live" ? "Timing measured in your browser" : "Sample timing",
          items: [
            { label: "Time to first token", value: seconds(run.firstChunkMs) },
            { label: "Total time", value: seconds(run.totalMs) },
            { label: "Chunks received", value: String(run.chunks.length) },
            ...(run.done?.serverMs?.firstToken != null
              ? [{ label: "First token, at the server", value: seconds(run.done.serverMs.firstToken) }]
              : []),
          ],
        },
        {
          kind: "text",
          title: "What the first wait contains",
          body:
            "Time to first token includes the trip to the server and the provider, waiting for capacity, and the model reading all of your input tokens before it can predict the first output token.",
        },
      ];
    },
  },
  {
    id: "recap",
    title: "The complete picture",
    short: "Recap",
    simple:
      "Your message travels to a server, gets processed by a language model, and the generated response travels back to your screen.",
    why: "Every AI chat app follows this path, however different it looks on screen.",
    changes: "You can follow a question from Send to answer, and say which parts are real and which are pictures.",
    deeper: () => [
      {
        kind: "text",
        title: "What real apps add",
        body:
          "Production apps often add more steps between the server and the model: earlier messages for memory, documents found by search (retrieval), tools the model can call, and safety checks on input and output. The basic journey stays the same.",
      },
      {
        kind: "text",
        title: "What you saw, and how",
        body:
          "Requests, checks, settings, tokens and timings are things an app can observe. The inside of the model was a simulation. In demo mode the answers and timings are samples written for the lesson; in live mode they are measured from your request.",
      },
    ],
  },
];

export const TAKEAWAYS: string[] = [
  "Your message becomes a structured request.",
  "The app server checks it and keeps the secret key.",
  "The provider runs the model, which sees only this request.",
  "Text is split into tokens, each with an ID.",
  "Layers turn tokens into numbers and score what comes next.",
  "The answer is built one predicted token at a time.",
  "Chunks stream back, so words appear early.",
];

export const MENTAL_MODEL = COPY[7].simple;

/** Captions for the three phases of the (simulated) model stage. */
export const MODEL_PHASES = [
  {
    label: "Tokens become numbers",
    caption: "Each token is looked up and turned into a list of numbers, drawn here as a column of cells.",
  },
  {
    label: "Layers mix in context",
    caption: "Layer by layer, the newest token gathers information from the tokens before it.",
  },
  {
    label: "Scores for the next token",
    caption: "The final numbers become a score for every token the model knows. Higher means more likely.",
  },
] as const;

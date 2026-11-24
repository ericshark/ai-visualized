# AI Under the Hood

Send a question and follow it from your browser to a language model and back. The request map shows where it goes. Eight interactive stages let you inspect the payload, see how text becomes tokens, and replay the streamed answer.

[Open AI Under the Hood](https://ai-visualized.ericzwierzynski.dev)

![AI Under the Hood showing the prompt composer and request map](docs/screenshots/lesson.jpg)

## Run locally

Use Node.js 24 and pnpm. Sample mode works without credentials.

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For Claude Live, copy the repository’s `.env.example` to `web/.env.local`, set `CLAUDE_API_KEY` there, and restart the dev server. Claude Haiku 5.5 streams the response through the Next.js server. The browser receives the answer, token totals, and timings, while the key stays on the server.

See the [technical reference](docs/technical-reference.md) and [deployment guide](docs/DEPLOYMENT.md).

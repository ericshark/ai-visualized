# AI Under the Hood

An interactive lesson that follows one AI request through the browser, the server, and the model. Pick a sample question, press **Send**, and step through eight animated stages, from tokenization to the streamed answer.

[Open AI Under the Hood](https://ai-visualized.ericzwierzynski.dev)

![AI Under the Hood lesson showing the request timeline and a visualization stage](docs/screenshots/lesson.jpg)

## How it works

The Next.js player replays sample events in demo mode. An optional FastAPI backend streams real response events and timings from OpenAI. Each visualization distinguishes sample data, live measurements, and conceptual simulations.

## Run locally

Use Node.js 24 and pnpm. The demo needs no API key.

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For live mode, start a second terminal at the repository root with `uv` installed:

```sh
cd backend
cp .env.example .env
# Set OPENAI_API_KEY in backend/.env.
uv run uvicorn app.main:app --reload --port 8000
```

The browser finds the local backend on port 8000. Set `NEXT_PUBLIC_API_URL` in the frontend environment if the backend uses another address.

[Technical reference](docs/technical-reference.md) · [Deployment](docs/DEPLOYMENT.md)

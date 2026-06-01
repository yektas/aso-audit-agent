# ASO Audit Agent

A Next.js + Mastra app that runs conversational App Store Optimization audits for iOS App Store listings.

Users paste an App Store URL or numeric app ID, confirm the matched listing, and receive a structured audit with scores, recommendations, competitor context, limitations, and supporting public evidence.

## Setup

Requirements:

- Node.js `>=22.13.0`
- OpenAI API key
- Firecrawl API key

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```bash
AGENT_MODEL=openai/gpt-5.5
OPENAI_API_KEY=sk-...
FIRECRAWL_API_KEY=fc-fc...
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
npm run mastra:dev
```

`npm run mastra:dev` starts Mastra Studio using `src/mastra` as the Mastra directory and local `mastra.db` storage.

## How It Works

- `conversationAgent` handles the chat experience and invokes the ASO audit workflow when the user provides an App Store URL or app ID.
- `asoAuditWorkflow` fetches Apple metadata, suspends for listing confirmation, collects public evidence, scores the listing, and returns the final audit.
- `reportAgent` produces schema-validated scores and recommendations from supplied evidence only.
- Conversation history is stored per anonymous browser visitor so users can return to previous audit threads.

A more detailed flow diagram is available at [`docs/agent-flow.html`](docs/agent-flow.html).

## Decisions Made

- **Workflow over loose tool calls.** The audit follows a fixed sequence with a confirmation gate in the middle, so a Mastra workflow with `suspend`/`resume` fit best — and made the parallel scoring branches easy to wire up.
- **Two agents, not one.** The conversation agent handles chat; the report agent handles scoring. Separating them keeps conversation text from bleeding into the scores.
- **9 of 10 rubric dimensions scored.** The **keyword field** is dropped — it's private App Store Connect metadata, never visible publicly, so there's nothing to cite.
- **App preview video scored on presence only.** Video presence is reliably detectable from public data, but the video itself can't be analyzed — so present earns partial credit, absent is flagged a gap. Weight: rubric's **5%**.
- **Title carries 25%** (vs. rubric's 20%) since it has the strongest public evidence and absorbs the dropped keyword field's weight. Every other dimension stays at its rubric weight; total still sums to 100.
- **Firecrawl returns markdown + HTML, not JSON.** Screenshots come from the HTML, the rest from markdown. The old JSON pass was redundant and cost an extra LLM call, so it was dropped.
- **Competitor comparison is a related-search sample, not a ranking.** Apple's public API returns related apps, not ranked competitors — so the report labels them as comparison signals.
- **Every LLM call has a deterministic fallback.** On timeout or unparseable output, the audit falls back to rule-based scores. The result is lower confidence, not a broken run.
- **Anonymous sessions, no login.** Threads are stored per browser visitor via Mastra memory, so you can return to past audits without an account.
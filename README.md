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

**Workflow over loose tool calls.** The audit has a fixed sequence with a hard confirmation gate in the middle, so a Mastra workflow with `suspend`/`resume` was the right fit. It also made the parallel scoring branches (copy, visuals, market signals) straightforward to wire up.

**Two agents, not one.** The conversation agent handles the chat. The report agent handles scoring. Keeping them separate means the report agent only ever sees the evidence passed to it — no conversation history, no way for listing text to bleed into the scores.

**I scored 9 of the 10 rubric dimensions.** The one I dropped:

- **Keyword field** — this is private App Store Connect metadata. It's never visible on the public listing page, so there's nothing to score. Faking it would've violated the "cite the specific evidence" requirement.

**App preview video is scored on existence only.** When a listing has a preview video, the Firecrawl markdown renders the player-control overlay (`assets/images/video-control/…`) and the HTML carries a `<video>` element — so video *presence* is reliably detectable from public data. I can't analyze the video itself (hook, length, silent playback), so this dimension is scored deterministically: present earns partial credit, absent is flagged as a real gap. Its weight is the rubric's **5%**.

**Title carries 25%** (above the rubric's 20%) because it's the dimension with the strongest public evidence; the rest of the keyword field's freed weight is absorbed there. Every other scored dimension — including **Description at 10%** and **App preview video at 5%** — sits at its rubric weight. Weights still sum to 100.

**Firecrawl returns markdown + HTML, not JSON.** Screenshots are extracted from the HTML; subtitle, promotional text, and in-app events from the markdown. The earlier JSON extraction format was redundant (it only covered fields the markdown already yields) and cost an extra LLM pass per audit, so it was dropped.

**Competitor comparison is a related-search sample, not a category ranking.** Apple's public search API returns related apps for a search term — it doesn't expose a ranked list of top competitors. The report labels these as comparison signals rather than "top 3 competitors" to be honest about what the data actually is.

**Every LLM call has a deterministic fallback.** If the model times out or returns something unparseable, the audit falls back to rule-based scores from the collected metadata. The result is lower confidence, not a broken run.

**Anonymous sessions, no login.** Conversation threads are stored per browser visitor using Mastra memory. You can close the tab and come back to previous audits without an account.
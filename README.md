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

- Used a Mastra workflow instead of loose tool calls because the audit has a fixed sequence, a confirmation checkpoint, parallel scoring branches, and typed outputs.
- Kept separate conversation and report agents so conversational behavior stays separate from evidence-grounded report generation.
- Added an explicit listing confirmation step to prevent auditing the wrong App Store result.
- Used public Apple APIs plus Firecrawl evidence instead of claiming access to private App Store Connect metadata.
- Persisted anonymous conversation threads with Mastra memory so reloads and follow-up questions work without requiring login.
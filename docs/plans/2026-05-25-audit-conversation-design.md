# Audit Conversation Design

## Goal

Turn the current single-page workflow runner into an agent-led audit conversation without replacing the placeholder ASO audit engine in this pass.

## Product Decisions

- The `asoAuditAgent` is the primary user-facing runtime; `asoAuditWorkflow` remains its controlled listing confirmation and audit action.
- An audit conversation continues after a result and may include follow-up questions or further App Listings.
- Listing confirmation supports a structured inline card and natural-language replies.
- Conversation threads persist across reloads and are exposed in a history sidebar.
- Authentication remains out of scope; a server-issued anonymous visitor cookie owns the visible threads.
- A new thread uses a branded welcome panel and starter prompts, then transitions into a focused chat workspace.
- `DESIGN.md` supplies the obsidian-and-lime visual language, applied to the conversation product rather than a marketing-page layout.
- The existing placeholder audit service remains unchanged.

## Architecture

`src/app/page.tsx` becomes composition only and renders an `AuditChatWorkspace`. The workspace owns selected-thread loading and chat state through a dedicated hook, while presentation is split into a conversation sidebar, welcome state, transcript, listing confirmation card, result presentation, and composer.

The frontend calls `/api/chat` for agent streaming. The agent decides when to invoke its registered `asoAuditWorkflow`. Workflow stream parts are interpreted as product UI:

- A suspended nested workflow displays an App Listing confirmation card.
- Confirm/reject buttons resume the pending agent run with structured confirmation data.
- Typed confirmation is submitted as normal conversation input and relies on Mastra's memory-backed automatic suspended-tool resumption; the structured buttons remain the guaranteed control path.
- Completed nested workflow output appears within the assistant transcript, while the composer remains available for follow-up.

## Persistence And Ownership

The server creates a stable HTTP-only visitor cookie when absent. The associated resource ID is derived only on the server and is used for all memory calls. Thread IDs may be sent by the client, but endpoints verify that each selected thread belongs to the cookie-owned resource before recalling messages or streaming chat.

Mastra `Memory` stores message history and generates concise titles from a thread's first user message. History endpoints support creating threads, listing the current visitor's threads, and recalling messages for one authorized thread. The previous shared default resource/thread behavior is removed.

## Interface

The desktop application has a history sidebar and main conversation surface. On small screens the history moves behind a simple toggle. A new empty thread shows a branded welcome panel with short task-focused starter prompts. An active thread shows streamed conversation turns, inline App Listing confirmation, workflow results, and the fixed composer.

The design uses the existing dark theme with the lime accent, translucent obsidian surfaces, restrained grid/noise atmosphere, and technical metadata typography from `DESIGN.md`. Decorative welcome-state treatment does not surround or distract from an active audit.

## Error Handling

- Unauthorized or missing thread access returns not-found semantics and does not reveal another visitor's thread existence.
- History and transcript failures show compact recoverable messages and leave creation/navigation usable.
- Agent and lookup failures leave the composer available for retry.
- Rejecting a proposed listing keeps the transcript and lets the user provide a corrected App Listing.

## Verification

- Run `npm run build`.
- Run React diagnostics after React changes.
- Verify in a browser: welcome prompt, new thread creation, sidebar restoration after reload, App Store ID and URL lookup, confirm, reject/correction, placeholder audit result, and follow-up turns.
- Verify with separate cookie jars that one anonymous visitor cannot list or retrieve another visitor's Conversation Thread.
- Inspect desktop and mobile layouts, including collapsed history.

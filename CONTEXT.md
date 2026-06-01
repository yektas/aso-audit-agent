# ASO Audit Conversation

This context covers how a user works with an assistant to identify an App Store listing and receive an app store optimization audit.

## Language

**Audit Conversation**:
An agent-led exchange in which a user requests, confirms, and discusses an ASO audit.
_Avoid_: Audit form, workflow UI

**App Listing**:
The App Store product page selected as the subject of an audit.
_Avoid_: App record, lookup result

**ASO Audit**:
An evaluation of an App Listing that produces optimization recommendations.
_Avoid_: Report generation flow

**Listing Page Evidence**:
Publicly crawlable facts from an App Listing's App Store product page that supplement lookup metadata for an ASO Audit.
_Avoid_: Private listing metadata, App Store Connect data

**Market Signal Evidence**:
Public review and related-app search signals used to ground an ASO Audit after Listing Confirmation.
_Avoid_: Audit evidence blob, market data service

**Unavailable Private Metadata**:
Listing information that is not reliably exposed on the public App Store product page or lookup API and therefore cannot be claimed as extracted unless the user supplies it.
_Avoid_: Missing crawl data

**Listing Confirmation**:
The user's explicit acceptance or rejection of an identified App Listing before an ASO Audit begins.
_Avoid_: Workflow approval

**Conversation Thread**:
A durable record of one Audit Conversation that can be resumed after navigation or reload.
_Avoid_: Browser session, default chat

**Conversation History**:
The user's titled list of prior Conversation Threads available for reopening in the audit interface.
_Avoid_: Shared transcript list

**Anonymous Visitor**:
A browser-scoped identity that owns Conversation Threads when no authenticated user account exists.
_Avoid_: Shared demo user

**Conversation Starter**:
A short assistant invitation and suggested audit prompts shown before the first user message in a Conversation Thread.
_Avoid_: Intake form

**Welcome Panel**:
A branded starting view that presents the Conversation Starter before an Audit Conversation begins.
_Avoid_: Marketing landing page

## Relationships

- An **Audit Conversation** concerns zero or more **App Listings** over time.
- An **ASO Audit** evaluates exactly one confirmed **App Listing**.
- **Listing Page Evidence** may supplement a confirmed **App Listing** after **Listing Confirmation** and before an **ASO Audit** is produced.
- **Market Signal Evidence** may supplement a confirmed **App Listing** after **Listing Confirmation** and before an **ASO Audit** is produced.
- **Unavailable Private Metadata** may constrain an **ASO Audit** even when lookup metadata and Listing Page Evidence are available.
- **Listing Page Evidence** is structured evidence extracted from a crawl; raw crawl text is supporting trace data, not the primary audit input.
- Failure to collect **Listing Page Evidence** reduces audit confidence but does not prevent an **ASO Audit** when lookup metadata and Listing Confirmation are available.
- Optional crawl configuration may be absent; in that case the ASO Audit records that Listing Page Evidence was skipped rather than failing.
- **Listing Page Evidence** is collected from the canonical public App Store URL for the confirmed App Listing, preserving the storefront country when available.
- Developer response crawling is outside the first Listing Page Evidence scope; review evidence remains limited to the existing recent review sample unless a later decision expands it.
- A **Listing Confirmation** applies to exactly one proposed **App Listing**.
- An **Audit Conversation** may produce more than one **ASO Audit**.
- One **Conversation Thread** preserves exactly one **Audit Conversation**.
- A **Conversation History** contains only Conversation Threads available to the same user identity.
- An **Anonymous Visitor** owns zero or more **Conversation Threads**.
- A new **Conversation Thread** begins with one **Conversation Starter** until the user sends a message.
- A **Welcome Panel** is shown only while a **Conversation Thread** has no user messages.

## Example Dialogue

> **User:** "Can you audit this App Store URL?"
> **Assistant:** "I found this **App Listing**. Is this the one you want to audit?"
> **User:** "Yes."
> **Assistant:** "I completed the **ASO Audit**. Let us review the recommendations."
> **User:** "Now audit the competitor listing I just pasted and compare it with the first one."

## Flagged Ambiguities

- "Chat agent experience" is resolved as an **Audit Conversation** led by the agent, not a predetermined workflow rendered with message styling.
- "Confirm" is resolved as **Listing Confirmation**, supported through both inline actions and equivalent conversational replies.
- An **Audit Conversation** continues after an **ASO Audit** result and can contain follow-up discussion or additional **App Listings**.
- An **Audit Conversation** persists as a **Conversation Thread** that can be restored after reload; separate conversations must not share one permanent default thread.
- The audit interface exposes **Conversation History** so a user can open prior **Conversation Threads** or start a new one.
- Until authentication exists, **Conversation History** belongs to an **Anonymous Visitor** identified by the server for one browser.
- New **Audit Conversations** use a **Conversation Starter** and prompt suggestions rather than an App Listing input form.
- The visual design language applies through a **Welcome Panel** and a branded conversation workspace, not through marketing-page sections around an active audit.
- Public crawling can reduce ASO blind spots, but it must not be described as access to App Store Connect-only fields.

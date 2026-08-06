# Gray Horizon Ops Dashboard — Build Brief: Phase 5 (Client Onboarding)

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** One transactional onboarding operation — company + client + portal invite + default features + starter tasks — exposed both as an MCP tool and a manual admin form. Do not build a bulk CSV importer (see §3) or the Today view.

---

## 1. What this is

Today, onboarding a client is several disconnected manual steps across different pages, and the quick-add client form doesn't even link a company. This phase makes it one operation, `onboardClient()`, callable two ways:

- **An MCP tool** (`onboard_client`) — the primary use case: an agent takes whatever messy input Max hands it (a paragraph, a spreadsheet, a chat), structures it against this tool's schema, and calls it. GrayPortal does no file parsing — the agent already did that before the call.
- **A manual admin form** at `/clients/onboard` — same underlying function, for onboarding without an MCP client open.

## 2. What one call creates (signed off with Max)

In a single transaction: the `companies` row, the `clients` row linked to it, a `users` row inviting the client's portal login (role `client`, unclaimed until their first sign-in — same admin-invite mechanism as Phase 2), the requested `client_features` rows enabled, and a starter task list (`src/config/onboarding.ts`'s `ONBOARDING_TASK_TEMPLATE` — kickoff call, gather assets, confirm portal access, staggered due dates, same "one place, not scattered across the UI" pattern as `STAGE_TASK_RULES`). Starter tasks sync to Google Tasks the same way any other task does (Phase 3's adapter, unchanged).

## 3. Why no CSV batch importer

Building real multi-row CSV ingestion (parsing, per-row validation, partial-failure UX, an error-reporting table) is materially more work than a single-client form, and the actual "AI agent uploads a file" workflow described is better served by the MCP path — Claude reads whatever file/data Max gives it and calls the tool once per client, already structured. If bulk human-driven CSV upload turns out to be a real recurring need, that's a distinct, larger follow-up, not folded into this phase.

## 4. Risk tier (signed off with Max)

`onboard_client` is not a Phase 4 "low-risk write" — it creates rows across five tables in one call. Marked `readOnlyHint: false, idempotentHint: false` in its MCP annotations (calling it twice creates two clients, not an update) so MCP clients default to prompting for confirmation every time, never auto-approving.

## 5. Not in scope

CSV/bulk import, editing the onboarding template per-client at call time (the starter task list is the same for everyone this phase), anything beyond the five things listed in §2.

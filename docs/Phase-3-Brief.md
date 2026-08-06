# Gray Horizon Ops Dashboard — Build Brief: Phase 3 (Google Calendar & Tasks Sync)

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** One-way sync from GrayPortal into Google Calendar/Tasks. Do not build the MCP server or the Today view — those remain later phases (see §8), and per Dashboard-Brief.md §9, the Today view is explicitly "built last, as a composition of everything above."

---

## 0. Read this first

Phase 0/1 (`docs/Dashboard-Brief.md`) and Phase 2 (`docs/Phase-2-Brief.md`) both deliberately laid groundwork for this phase without building it: `tasks.googleTaskId` / `tasks.syncState` columns exist and are unused; the `agent` audit-log actor type exists; and §9 of the original brief requires "all external API calls must go through a single adapter module" — a rule stated before there was any external API to call, precisely so this phase doesn't have to retrofit that discipline.

Three rules that override everything else in this brief, same spirit as the prior two:

1. **Business logic stays in the application layer.** Same reason as always — the MCP phase after this one depends on it, and sync logic is exactly the kind of thing that's tempting to bury in a cron handler.
2. **One-way sync only: GrayPortal → Google.** Signed off with Max — edits made directly in Google Calendar/Tasks do not flow back. This is a deliberate scope cut, not an oversight: two-way sync needs push-notification webhooks and conflict resolution, neither of which this phase builds.
3. **Stop at the end of this phase and wait.** Do not scaffold the MCP server or the Today view.

---

## 1. What this is

Max's own Google Calendar and Google Tasks, kept up to date automatically from GrayPortal, so he sees his pipeline and task list where he already lives day-to-day instead of needing to open the dashboard to know what's next. Admin-only — contractor and client roles have no Calendar/Tasks surface and nothing here changes their access.

**Not in scope:** two-way sync, a UI for choosing what syncs (governed by fixed rules, not user-configurable toggles, at least initially), syncing for any role but admin, Google Meet/Docs integration, notifications beyond what Google Calendar/Tasks already send natively.

## 2. What already exists (verify, don't rebuild)

- `tasks.googleTaskId` (text) and `tasks.syncState` (text, freeform) — present in schema, never written to.
- `users.role` / Firebase Auth Google-provider sign-in — the OAuth identity this phase extends with incremental scopes, not a new auth system.
- `actorType` enum on `audit_log` includes `agent` — relevant if sync writes are ever triggered by something other than a direct user action (e.g. a scheduled reconciliation job), though the actor for most sync writes triggered by a user mutation should still be `user`.
- The `--adapter module for all external API calls--` requirement from Dashboard-Brief.md §9 — no such module exists yet; this phase creates it.
- **Deals have no `googleEventId` column today.** If deals sync to Calendar (open item, §9 below), a migration adds it, mirroring the existing `tasks.googleTaskId` pattern.

## 3. What syncs, and to what

Two distinct Google surfaces, two distinct source tables — **confirm before building, this is the open item that most changes the shape of the work (§9.1):**

- **Google Tasks** — natural fit for the `tasks` table, which already has `googleTaskId`/`syncState` waiting. A GrayPortal task creates/updates a Google Task with matching title, due date, and completion state.
- **Google Calendar** — candidate source is deals' `nextAction` / `nextActionDate` (a dated, titled thing that behaves like a calendar entry) and/or `activities` of type `meeting`. Needs Max's call on which, or both.

Sync triggers on the same mutation paths that already exist (`setTaskStatus`, deal stage/next-action updates, etc.) — not a separate UI action. A task or deal saved through the normal CRM flow pushes to Google as part of that same request/transaction where practical, or via a queued follow-up if Google's API latency makes inline sync impractical (open item, §9.4).

## 4. Application-layer work

- **Single adapter module** (`src/lib/google/calendar.ts` / `tasks.ts`, or one combined module) wrapping every Calendar/Tasks API call — nothing outside it talks to Google directly. This is the rule Phase 0/1 pre-committed to.
- **OAuth token storage.** Incremental consent adds `calendar` and `tasks` scopes to Max's existing Google sign-in. Refresh tokens are secrets — never in the repo, never logged, stored encrypted at rest (Postgres column encryption via `pgcrypto`, or a dedicated secret store — propose before building). Token refresh failures must be visible, not silently retried forever.
- **Sync state and failure visibility.** Dashboard-Brief.md §4.4 already anticipated this: *"A CRM must signal state: sync failed, deal stalled, deal won"* — the `--gh-warning`/`--gh-danger` status tokens exist for exactly this. `syncState` should be a small fixed set of values (e.g. `synced`, `pending`, `failed`), not truly freeform text, surfaced as a badge on the task/deal, colour-plus-label per brief §4.4.
- **Idempotency.** Re-running a sync for a row that's already synced must not create duplicate Google Calendar events/Tasks — match on the stored `googleEventId`/`googleTaskId` and update in place, create only when absent.
- **Soft-deleted / stage-changed-to-Lost rows** stop syncing (or get removed from Google) rather than lingering — define the exact behavior before building (open item §9.5).

## 5. Security

- Same posture as Phase 0/1 §5: refresh tokens are secrets under §5.5's "no secrets in repo, ever" rule, at rest encrypted, never returned to the client.
- Every sync-triggered write is still an audited mutation (`auditedUpdate`/`auditedInsert`, brief §5.4) — `syncState` changes and Google-side IDs are field-level diffs like anything else.
- Google API calls are rate-limited and their failures don't block or corrupt the underlying GrayPortal mutation — a Google Calendar outage must never prevent Max from saving a deal.

## 6. Design

No new screens beyond a `syncState` badge on task rows / deal detail (uses existing status-colour tokens, brief §4.4) and, if useful, a small "last synced" timestamp. No new design tokens.

## 7. Working method

Same as Phase 0/1 and Phase 2 (brief §8/§7): propose before building, small reviewable commits, PR descriptions explain security properties for anything touching auth, tokens, or the DAL. **Propose the adapter module's shape and the OAuth token storage mechanism specifically, and wait for sign-off, before writing code** — same reasoning as Phase 2's login-path checkpoint: getting a secrets-handling design wrong is expensive to unwind once real tokens exist.

## 8. Forward compatibility — still design for, still do not build

Unchanged: the MCP server and the Today view remain out of scope. The adapter module built here is exactly the seam Dashboard-Brief.md §9 says the MCP phase will plug into — build it generically enough that "call this from an MCP tool instead of a mutation handler" isn't a rewrite, but don't build the MCP server itself.

## 9. Open items for the owner — resolved 2026-08-05

1. **Which entities sync to Google Calendar** — deals' `nextAction`/`nextActionDate`. Meeting-type activities are not in scope for this phase.
2. **OAuth token storage mechanism** — Postgres column encryption via `pgcrypto`, key held outside the database.
3. **Inline vs. queued sync** — inline/synchronous, in the same request as the CRM mutation. No job-runner infrastructure this phase.
4. **Sync-state values and failure UX** — build as proposed in §4: a small fixed set (`synced` / `pending` / `failed`), surfaced as a status badge using the existing `--gh-warning`/`--gh-danger` tokens per brief §4.4.
5. **Behavior on soft-delete / deal→Lost** — remove the corresponding Google Calendar event / Google Task.

# GrayPortal — Moving Forward Brief: Phase 6 Onward

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** Everything not yet built as of Phase 5. Companion to `Dashboard-Brief.md` (Phase 0–1) and `Phase-2-Brief.md` through `Phase-5-Brief.md`. Read `Master-Brief.md` first for the full-system picture — this document is the construction queue.

---

## 0. Read this first

This document is a **queue of phases, not a single build**. Point a future Claude Code session at one numbered phase section at a time — each is written to be self-contained enough to brief a session, but assumes Phases 0–5 already exist and are not being modified except where a phase below explicitly says so.

Three rules carried forward from `Dashboard-Brief.md` §0, unchanged and non-negotiable for every phase in this document:

1. **Security is structural, not a checklist.** Where a security property can be enforced by making the insecure thing impossible to write, do that instead of relying on discipline.
2. **Business logic lives in the application layer**, never in UI components or route handlers. Every phase below is a DAL-level capability first, an MCP tool second, a UI third.
3. **Do not anticipate.** Build the phase you're given. Don't scaffold the next one.

A fourth rule specific to this stage of the project:

4. **Every new write capability gets an MCP tool risk tier at the same time it gets built**, not retrofitted later. Decide `readOnlyHint` / `idempotentHint` as part of the design, per the pattern established in `Phase-4-Brief.md`.

---

## 1. Status recap

| Phase | Covers | Status |
|---|---|---|
| 0 | Foundation — auth, RLS, audit log, CI/CD, design system | Built |
| 1 | CRM core — companies, contacts, deals, activities, documents | Built |
| 2 | Client portal — login, tasks (read-only), documents, referrals | Scaffolded, no client has logged in yet |
| 3 | Google Calendar/Tasks one-way sync | Approved, build pending |
| 4 | MCP server — Claude tool access | Scoped, build pending |
| 5 | Client onboarding — `onboardClient()` | Scoped, build pending |
| 6–20 | Everything below | Not started |

Notion is being fully retired as the business's data/notes powerhouse. Drive remains the canonical file store (GrayPortal links/embeds, never duplicates storage). Xero remains the accounting system of record (GrayPortal reads a snapshot, never replaces it). No CRM tool other than GrayPortal is in use — Phase 1 is the pipeline, full stop.

---

## 2. Phase 6 — Credential Vault

**What it is:** Encrypted, per-client secrets storage — replaces plaintext credential lists (client Google Ads / GA4 / GTM logins currently live as unencrypted text in the old Notion setup). Also becomes the storage location for the Mobile Operations Package decryption password (Phase 18).

**Build before:** Phase 8 (client portal expansion touches client records) and Phase 18 (MOP depends on this existing).

**Data model:** A `credentials` table scoped by `client_id` (or `null` for internal/business-wide secrets, e.g. the MOP password) — fields: label, username/email, secret (encrypted), URL, notes, last-rotated date. Secret column encrypted the same way Phase 3's Google OAuth tokens are (`pgcrypto`, key held outside the DB).

**Access model:** Viewing a decrypted secret requires a **fresh MFA/re-auth challenge**, not just an active session — this is a deliberate departure from normal read access. Never display a secret as "shown once, then gone." It must always be retrievable by an authenticated, MFA-verified admin. Every reveal is an audit log event (`actor`, `credential_id`, `timestamp`) at the same severity tier as a mutation, even though reads don't normally hit the audit log elsewhere in the app.

**Screens:** Credential list per client (masked values), reveal-on-MFA flow, add/edit/rotate form, business-wide (non-client) credentials section for internal tools and the MOP password specifically.

**Not in scope:** Password generation/strength tooling, browser extension/autofill, sharing secrets with contractors or clients (admin-only, full stop).

---

## 3. Phase 7 — Pricing Catalogue

**What it is:** Structured ingestion of `gh_pricing_framework_v5.md` (the authoritative pricing source — Notion's old package pages are dead and should not be migrated). Every service/deliverable becomes a queryable record instead of a markdown table.

**Data model:** `service_modules` (GS / GA / AO / SS / RA / GX per the framework's module codes) and `service_items` — `id` (the framework's existing IDs, e.g. `ga-google-ads-mgmt`), module, deliverable name, current price, suggested price, billing type (one-off / monthly / range), notes. Preserve the framework's "Current vs Suggested" distinction — **AI-agent quoting defaults to Current unless told otherwise**, exactly as the source document states.

**Consumers:** Feeds Phase 5's `onboardClient()` (attach services to a new client), and later the deferred Agreement Generation phase (§13). Not itself a proposal builder — just the structured price list those features read from.

**Not in scope:** A pricing editor UI beyond basic admin CRUD — the framework file is the source of truth; re-import/re-sync on change rather than building parallel editing surfaces. Public/client-facing pricing display (this data is internal-only, per the source file's own header).

---

## 4. Phase 8 — Client Portal Expansion

**What it is:** Extends Phase 2's portal with the parts of the old Notion client-portal folders that actually got used: Ideation (idea backlog), Roadmap, Meeting Summaries, Tool Stack, plus a Drive-embed for files and a Looker Studio iframe for reporting. Also completes the Referral feature's other half — Phase 2 only built submission; this phase adds lifecycle tracking.

**Sections to add to `/portal/*`:**
- **Ideation** — list of growth/strategy ideas per client, admin-writable, client read-only (matches current usage; open for a later "client can propose" flag if wanted).
- **Roadmap** — structured version of the current markdown roadmap pages.
- **Meeting Summaries** — call-note records per client (manually entered or agent-drafted — see Phase 20's relationship to this).
- **Tool Stack** — simple list of tools/platforms in use per client (current + planned), replacing the Notion CSV pair.
- **Drive embed** — a linked/embedded Drive folder view scoped to that client's folder, not a file upload/storage system of its own.
- **Looker Studio embed** — iframe of the client's existing Looker dashboard, admin-configured URL per client, no native reporting engine being built to replace it.

**Referral lifecycle (extends Phase 2):** `referrals` table gains status (`submitted → contacted → converted → discount applied`), and applies the documented 20%-off-for-2-months rule (with stacking) automatically when a referral converts, rather than tracking that manually.

**Not in scope:** Client-editable Ideation/Roadmap (admin-only unless revisited), a native reporting/BI engine (Looker stays authoritative), file storage inside GrayPortal (Drive stays authoritative).

---

## 5. Phase 9 — Financial Snapshot (Xero, read-only)

**What it is:** A read-only pull from Xero showing retainer/revenue figures per client and business-wide, replacing the manual Cashflow.csv habit. GrayPortal never writes to Xero in this phase.

**Data model:** No new financial ledger — cache Xero API responses (invoice status, amounts, due dates) against `client_id`, refreshed on a schedule (see Phase 17's reminder engine, or a simple cron).

**Screens:** A financial summary section on each client record (current retainer, payment status, next invoice date) and a business-wide rollup on the Homepage (Phase 16).

**Not in scope:** Invoice creation, GST/tax calculation (that stays in Xero), any two-way sync. If two-way sync is ever wanted, it is a distinct future phase with its own security review — not an extension of this one.

---

## 6. Phase 10 — Email System

**What it is:** The largest phase in this document. Native send/receive/thread against Google Workspace (Gmail API), with every email touching a Company/Contact/Deal automatically logged as an Activity.

**Scope:**
- OAuth against the same Google grant Phase 3 establishes (extend scopes, don't create a second auth flow).
- Inbound: match incoming mail to existing Contacts by email address, log as Activity, surface unmatched mail in a triage view rather than silently dropping it.
- Outbound: compose/send from within a Deal/Contact/Company record, threaded, logged automatically (no separate "log this email" step — sending *is* logging).
- Templates for known recurring sends: proposal follow-up, onboarding welcome, report delivery notification. Stored as data (subject/body with variable placeholders), not hard-coded strings.

**Not in scope for this phase:** Full inbox client (no folders/labels/search-across-all-mail UI — GrayPortal shows mail *in the context of a CRM record*, it does not replace Gmail's own interface). Drafting/proofreading assistance is a capability layered on top later, not a blocking requirement of this phase.

**Security:** Email content is sensitive client data — same tenant-isolation rules as everything else apply to logged email records. Rate-limit outbound sending. OAuth token storage follows the Phase 3/6 encryption pattern.

---

## 7. Phase 11 — Lead Capture

**What it is:** The existing website inquiry form is wired to auto-create a Lead (Company + Contact, status "Identified") in GrayPortal instead of arriving only as an email/notification.

**Build:** A public, unauthenticated intake endpoint (rate-limited, validated, CSRF/spam-protected) that the website form posts to, mapping form fields to Company/Contact creation via the same DAL functions Phase 1 already exposes for manual quick-add. Reuses existing entity-creation logic — this is a new *entry point*, not new business logic.

**Not in scope:** A form builder (the form already exists on the website and isn't being rebuilt), lead scoring beyond what Phase 13's health score already covers.

---

## 8. Phase 12 — Unified Notifications

**What it is:** In-app + email notifications for overdue tasks, stalled deals, upcoming payment dates, and any alert generated by Phase 17 (reminders) or Phase 19 (security monitoring). Replaces reliance on Google Calendar/Tasks' native reminders, which Phase 3 explicitly declined to build around.

**Data model:** A `notifications` table (recipient, type, payload, read/unread, created_at) plus a delivery layer (in-app bell/list is required; email delivery required; SMS/push explicitly out of scope unless revisited alongside Mobile Ops).

**Triggers to wire up first:** deal with no next action, task overdue, Phase 9's payment-due-soon, Phase 19's security alerts, Phase 17's recurring reminders firing.

**Not in scope:** A user-configurable notification-preferences center (single admin user — build the triggers that matter, not a settings page for an audience of one).

---

## 9. Phase 13 — Client Health Score

**What it is:** A fully automated composite score per client, recomputed on a schedule (not manually entered). Signals: payment status/lateness (Phase 9 data), task completion rate, days since last logged activity (Phase 10/Activities), deal-stage momentum.

**Build:** A scoring function in the DAL, computed on a nightly job (or triggered on relevant data changes), producing a score + trend (up/down/flat) surfaced as a badge on the client record and the Homepage.

**Not in scope:** NPS collection, sentiment analysis on email/comms content, predictive churn modeling — all meaningfully harder, all need data not currently captured. Revisit only once Phase 10 has been live long enough to generate real engagement history.

---

## 10. Phase 14 — Contractor Role

**What it is:** The `contractor` role has existed in the schema since Phase 0 and has never had a screen. This phase gives Yuvi (or future contractors) an actual portal: assigned tasks, relevant deal/company context (commercial fields like deal value withheld — see `Dashboard-Brief.md` §5.8's existing security test for this), and nothing else.

**Not in scope:** Time tracking (unless separately requested — currently out of scope business-wide), contractor-initiated CRM writes beyond task status updates (mirrors the low-risk write pattern Phase 4 already established for MCP tools).

---

## 11. Phase 15 — Search Expansion

**What it is:** Phase 4's MCP `search` tool and Phase 1's global search currently cover companies/contacts/deals only. This phase extends both to span everything built since: documents, email (Phase 10), Ideation/Roadmap/Meeting Summaries (Phase 8), tasks.

**Build:** Likely a move from simple field-matching to a proper search index (Postgres full-text search is probably sufficient at this data volume — don't reach for a dedicated search service without justifying it). Exposed identically through the UI global search and the MCP `search` tool so agent and human search behave the same way.

**Not in scope:** Semantic/vector search unless field-matching proves genuinely insufficient in practice — don't build it speculatively.

---

## 12. Phase 16 — Homepage / Command Center

**What it is:** What `Dashboard-Brief.md` §9 called "Today view," expanded per the owner's request into a proper homepage: welcome message, business-wide snapshot, and the visual centerpiece of the whole app. Built **last** among the "read" surfaces because it composes data from nearly every other phase — this is the one place `Dashboard-Brief.md`'s forward-compatibility note explicitly anticipated.

**Contents (compose from what exists by the time this is built):**
- Pipeline snapshot (value by stage, deals with no next action)
- Today's/this week's tasks across all clients
- Financial rollup (Phase 9)
- Client health scores at a glance (Phase 13), flagging any in decline
- Recent activity feed
- Notifications summary (Phase 12)

**Design note:** This is the one screen where Cormorant Garamond display treatment and the site's serif-italic emphasis device (`Dashboard-Brief.md` §4.6) should be used more generously than anywhere else in the app — it's the "front door," not a dense working table. Still: no gradients, no illustration, squared geometry holds throughout.

**Not in scope:** Customizable/widget-based dashboards (single admin user — build the view that's actually useful, not a configuration layer).

---

## 13. Phase 17 — Recurring Task & Reminder Engine

**What it is:** A general scheduler for recurring internal obligations — not a workflow/automation builder (see §14, explicitly deferred). Define a recurring template (interval: monthly, quarterly, custom) that auto-creates a task and fires a notification when due.

**First three templates to ship with:** "Refresh the Mobile Operations Package" (monthly, feeds Phase 18), "Run backup restore drill" (quarterly, extends `Dashboard-Brief.md` §5.7's one-time restore test into a recurring obligation), "Review client health scores" (monthly, Phase 13).

**Data model:** `recurring_templates` (name, interval, next_due, task_template) → generates rows in the existing `tasks` table on schedule, same as Phase 5's onboarding task generation pattern — reuse that mechanism rather than building a second one.

**Not in scope:** User-defined arbitrary recurrence rules beyond the fixed interval types above at launch; a full workflow/condition engine (§14).

---

## 14. Phase 18 — Mobile Operations Package (MOP)

**What it is:** An admin-only, periodically-regenerated encrypted zip archive containing everything needed to stand up a working "GrayHorizon HQ" on any device (rental laptop, etc.): agent configs/tool stack manifest, login list (pulled from Phase 6's vault), MCP connection details.

**Build model — deliberately simple, per owner direction:** This is a **static file, manually regenerated and re-uploaded** on a monthly cadence (via Phase 17's reminder) or before a known need — not a live/on-demand generation system. Keep the code lighter: an admin action that bundles current vault contents + tool manifest into a zip, stores it, and supersedes the previous one.

**Security:**
- The zip is encrypted. The decryption password is **not shown once and discarded** — it lives in Phase 6's Credential Vault, retrievable only behind a fresh MFA challenge, exactly like any other stored secret.
- Every MOP generation and every download is a high-severity audit log event.
- Old MOP archives are deleted (not soft-deleted-and-kept) once superseded — minimize how many copies of "everything sensitive in one file" exist at once.

**Not in scope:** Live/on-demand generation, device-binding, remote wipe — all valid future hardening, not required for the static-file model chosen now.

---

## 15. Phase 19 — Security Monitoring & Backup Drills

**What it is:** Two related, lightweight security additions, bundled because both ride on infrastructure Phase 0 already built.

**Anomaly monitoring (rules-based, not ML):**
- Alert on login from a new device/IP not seen before for the admin account.
- Rate-limit and alert on repeated failed logins.
- Flag unusually large data reads/exports (e.g., a bulk pull of every client's Phase 6 credentials at once) as a high-severity audit event with a notification (Phase 12), not just a log line.

**Backup/restore drills:** `Dashboard-Brief.md` §5.7 required one *initial* restore test. This phase makes it recurring via Phase 17's engine — quarterly, minimum — and requires the backup itself to be encrypted at rest, which the original brief didn't explicitly state.

**Not in scope:** Behavioral/ML-based anomaly detection, geographic "impossible travel" heuristics beyond simple new-device/new-IP flagging — not justified at this data volume or team size.

---

## 16. Phase 20 — AI Task Planner

**What it is:** Extends Phase 4's MCP tool surface (not a new server or auth model) with agent-assisted task prioritization: given the current task list, deal stages, next-action dates, and Phase 13's health scores, propose an ordered priority list rather than requiring Max to triage manually.

**Build:** A new MCP tool (e.g. `prioritize_tasks`) that reads existing data via the DAL and returns a ranked view — read-only (`readOnlyHint: true`), since it proposes rather than reassigns. If it later gains the ability to *reorder or reassign* tasks directly, that's a write action requiring the same prompt-before-execute pattern as every other risk-tiered MCP tool.

**Not in scope:** Auto-execution without confirmation, calendar-aware day-planning (that's the deferred AI Calendar Assistant, §14 below — different dependency chain, not being built now).

---

## 17. Explicitly deferred — do not build

Carried over from discussion, not scheduled, listed here only so no phase above accidentally reintroduces them as a dependency:

- **General workflow/automation engine** (trigger→condition→action builder). Phase 1's hardcoded stage-task rule and Phase 17's fixed reminder templates cover launch needs. Revisit only if the fixed-template approach genuinely runs out of headroom.
- **AI Workflow Builder** (auto-generates automations from SOPs). Depends on both the deferred workflow engine and a documented SOP corpus — the internal wiki was explicitly cut from scope, so this has no input data to work from even if built.
- **AI Calendar Assistant** (auto-scheduling, day-planning). Needs two-way Calendar sync; Phase 3 is one-way by deliberate decision. Reopening that decision is a prerequisite, not a detail of this feature.
- **AI Docs Assistant** (drafting/proofreading). Valid future capability layered onto Phase 10 (Email) and Phase 8 (Meeting Summaries) once those exist and are in daily use — not a standalone module.
- **Agreement / contract e-signature generation.** Depends on Phase 7's pricing data existing first. Explicitly not an MVP feature; revisit once Phase 7 is live and the existing manual Proposal Review checklist process is feeling the friction this would solve.
- **Agent Inbox** (message the agent from any device via email/SMS/chat webhook, separate from an MCP client). This was recommended early in scoping as the "any device" half of the original brief and was never explicitly confirmed or cut in later discussion — **flagged in §18 below for a decision**, not assumed either way.

---

## 18. Open items for the owner

1. **Agent Inbox** (§17) — confirm whether this is in scope. Phase 4's MCP server gives an agent tools to act; it does not give you a way to *reach* the agent from outside a Claude client (phone texting a request while away, etc.). If the original "any device" vision still stands, this needs its own phase number.
2. **Phase sequencing** — the order above (6→20) is a dependency-driven suggestion, not a mandate. Credential Vault (6) and Pricing Catalogue (7) are placed early because later phases read from them; everything from Phase 9 onward can reasonably be reordered by business priority.
3. **Email provider scopes** — confirm exactly which Google Workspace account/domain Phase 10 authenticates against before that phase starts.
4. **Looker Studio URLs** — per-client dashboard links need to exist and be supplied before Phase 8's embed can be wired up.
5. **Xero API access** — confirm API credentials/app registration exists in Xero before Phase 9 starts.

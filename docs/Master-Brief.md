# GrayPortal — Master Brief

**For:** Claude Code, and anyone (human or agent) that needs the full picture before touching a single phase
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Purpose of this document:** The whole system, in one place — what it is, who it's for, everything it does, and the principles that hold it together. This is a reference, not a build queue. The full original build queue (Phase 0–20) plus the 2026-08-22 owner-review backlog (Phase 21–24) is built — see git history / current code for how any of it works. The only work still open is tracked in `GrayScale-Brief.md`.

---

## 1. What GrayPortal is

GrayPortal is the operating system for Gray Horizon, a solo-led premium digital marketing agency in Auckland. It replaces Notion as the business's information and data powerhouse, while Drive remains the file store and Xero remains the books — GrayPortal is the layer that ties CRM, client relationships, internal operations, and AI-agent-driven fulfillment together, rather than one more app sitting next to those two.

It is built around a single idea that shows up in every phase: **business logic lives in one place (the data access layer), so the same capability is available identically to a human clicking a button, an admin using the API, and Claude acting as an agent through MCP.** GrayPortal isn't a CRM with AI bolted on afterward — the agent surface was architected in from Phase 0.

**It is not an ERP.** No inventory, no native invoicing engine, no time tracking (at present). Xero stays the accounting system of record; GrayPortal reads a financial snapshot from it, never replaces it.

**It is not a generic no-code tool.** Every entity, screen, and automation reflects how Gray Horizon actually runs — the pipeline stages, the pricing framework, the client onboarding funnel — not a configurable blank slate.

---

## 2. Who uses it

| User | Access |
|---|---|
| **Max (admin)** | Full access to everything: pipeline, financials, credentials, internal ops, agent tooling. |
| **Contractors** (e.g. Yuvi) | Scoped portal — assigned tasks and non-commercial context only. No pipeline value, no financials, no credentials. |
| **Clients** | Their own portal only — tasks, documents, reports, roadmap, referrals. Never pipeline/deal economics, never other clients' data. |
| **Claude / AI agents** | Everything an admin can do, gated by MCP tool risk tiers — read tools auto-approved, writes always prompt, high-risk writes (like onboarding a client) always require confirmation. Acts through the same DAL as every human user; no separate, weaker code path. |

Tenant isolation is enforced at the data-access layer for every one of these — a query that doesn't correctly scope to what the caller is allowed to see fails closed rather than leaking rows.

---

## 3. Architectural principles (apply everywhere, no exceptions)

These were established at the start of the build and hold for every phase built since:

- **Security is structural.** Where an insecure state can be made impossible to write rather than merely checked for, that's the required approach.
- **Business logic lives in the DAL**, never in UI components or route handlers — the reason an MCP server (Phase 4) was a thin wrapper instead of a rewrite, and the reason every future capability should be designed MCP-tool-first.
- **Deny by default.** New routes are locked unless explicitly opened. New DAL queries fail rather than return unscoped data.
- **Soft deletes only.** Nothing is ever hard-deleted.
- **Append-only audit log** on every mutation and every sensitive read (credential reveals, MOP downloads): actor identity, actor type (`user` | `agent` | `system`), field-level diff, timestamp.
- **Every write capability gets an explicit MCP risk tier** (`readOnlyHint`, `idempotentHint`) at design time, not retrofitted.
- **One adapter module per external system** (Google, Xero, Drive, Looker) — no external API call happens outside its dedicated adapter.
- **UTC storage, Pacific/Auckland rendering**, everywhere a timestamp exists.

---

## 4. Full feature inventory

### 4.1 Core CRM (Phase 1 — built)
Companies, Contacts, Deals, Activities (polymorphic: call/email/meeting/note), Documents. Configurable pipeline (`Identified → Contacted → Meeting booked → Pitch delivered → Proposal out → Won/Lost/Dormant`) with enforced rules: no deal without a next action, no Lost without a close reason, every stage change auto-logged and auto-tasked.

### 4.2 Client Portals (Phase 2, expanded Phase 8)
Login, task visibility (read-only), document access, referral submission and lifecycle tracking, Ideation backlog, Roadmap, Meeting Summaries, Tool Stack list, an embedded Drive folder view, and an embedded Looker Studio report. Feature-gated per client via a toggle registry, so not every client sees every section.

### 4.3 Financials (Phase 7, Phase 9)
A structured Pricing Catalogue sourced from `gh_pricing_framework_v5.md` (module-coded services, current vs. suggested rates), and a read-only Xero snapshot showing retainer/payment status per client and business-wide. GrayPortal never writes financial records — Xero stays authoritative.

### 4.4 Communications (Phase 3, Phase 10, Phase 12)
One-way Google Calendar/Tasks sync (deal next-actions, task list). Native Gmail-backed email — send/receive/thread, auto-logged as Activities, with templates for recurring sends (follow-up, onboarding, report delivery). Unified in-app + email notifications for overdue tasks, stalled deals, payment dates, and security/reminder alerts.

### 4.5 Growth & Lead Flow (Phase 11, Phase 8's referral lifecycle)
Website inquiry form wired directly into Lead creation. Referral program automation (20%-off-for-2-months, stacking) applied on conversion rather than tracked manually.

### 4.6 Intelligence Layer (Phase 13, Phase 15, Phase 20)
Automated client health scoring (payment status, task completion, activity recency, deal momentum — computed, never manually entered). Full-text search spanning CRM records, documents, email, and portal content, exposed identically to the UI and to Claude via MCP. AI-assisted task prioritization as an MCP tool reading live pipeline/task/health data.

### 4.7 Internal Operations (Phase 14, Phase 16, Phase 17)
Contractor portal (assigned tasks, non-commercial context). A homepage/command center — welcome view, pipeline snapshot, financial rollup, health scores, activity feed, notifications — built last because it composes everything above it. A recurring task/reminder engine driving three standing obligations: MOP refresh, backup restore drills, health-score review.

### 4.8 Security & Continuity (Phase 6, Phase 18, Phase 19)
An encrypted Credential Vault (per-client and business-wide secrets, MFA-gated reveal, no "shown once" secrets anywhere in the system). A Mobile Operations Package — a periodically regenerated, encrypted, admin-only archive bundling tool/agent configuration and credentials so a full working "GrayHorizon HQ" can stand up on any device, with its decryption password itself living in the Vault behind MFA. Rules-based anomaly monitoring (new-device login, failed-login rate limiting, bulk-export flagging) and recurring, encrypted, tested backups.

### 4.9 Agent Layer (Phase 4, Phase 5, Phase 20)
An MCP server exposing the DAL as tools for Claude Desktop/Code/claude.ai, with a fine-grained risk model — reads auto-approved, writes always confirmed. A transactional client-onboarding tool (`onboardClient()`) explicitly designed for an agent to structure messy input (a paragraph, a spreadsheet, a chat) into a single validated call rather than a bulk CSV importer. Task prioritization as a read-only agent capability layered on top.

---

## 5. Explicitly out of scope

Cut deliberately, not by omission — listed here so no future phase quietly reintroduces them as an assumed dependency:

- **Internal wiki / knowledge base.** Considered and dropped. Notes stay attached to CRM records; no standalone docs/SOP module.
- **General workflow/automation builder.** A fixed library of hardcoded rules (stage-triggered tasks, the three reminder templates) covers launch needs. A visual trigger→condition→action builder is a large, separate project not justified at this scale.
- **AI Workflow Builder, AI Calendar Assistant, AI Docs Assistant** (Motion-inspired). Each depends on something else that's out of scope (SOP corpus, two-way calendar sync, mature email history) — deferred future ideas, not current work.
- **Agreement/contract e-signature generation.** Depends on the Pricing Catalogue existing first; not an MVP feature.
- **Bulk data import/migration tooling.** Client records are created one at a time, by design — including by an agent parsing unstructured input into the onboarding tool — rather than via a CSV importer.
- **Invoicing, inventory, time tracking.** Xero and existing processes cover these; not being rebuilt inside GrayPortal.
- **Native mobile app.** Single responsive web codebase, PWA-ready. No app-store build.

---

## 6. Brand & design system

Carried through every phase without exception, summarized here:

- **Palette:** monochrome, dark-first (`--gh-black` background, `--gh-light` text, `--gh-white` as the only "accent," reserved for emphasis and primary actions). Three muted status hues (`--gh-success`, `--gh-warning`, `--gh-danger`) exist solely for state signalling, never decoration.
- **Type:** Cormorant Garamond (display — page titles, record names, key metrics, used sparingly) paired with DM Sans (everything functional). A monospace face for IDs, timestamps, and currency alignment in tables.
- **Geometry:** `border-radius: 0` everywhere except circular elements. No rounded cards, inputs, or buttons.
- **Voice:** Spare, declarative, confident. Buttons state what happens; errors state what's wrong and how to fix it. Never apologetic, never chatty.
- **Density:** Built for a tool opened forty times a day, not a marketing page — no ambient motion, no scroll choreography, no illustration.

---

## 7. Phase index

Phases 0–20 (the full original build queue) and the 2026-08-22 owner-review backlog (Phase 21–24: quick fixes, personal finance calculator, task system overhaul, client portal redesign) are all built. Their build briefs have been removed from `docs/` now that they're done — see git history for the original specs, or the current code for how each capability actually works (feature inventory in §4 above).

The only work still open — the "GrayScale" product family (Apexus, Tempus, Solus branding, suggested moves) plus a set of ideas deliberately deferred rather than scheduled (general workflow/automation engine, AI Calendar/Docs assistants, e-signature, Agent Inbox) — is tracked in `GrayScale-Brief.md`.

# GrayPortal — Owner Notes Backlog Brief: Phase 21 Onward

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** Translates Max's working-review notes (2026-08-22) into scoped, buildable phases against the current codebase. Companion to `Master-Brief.md`, `Dashboard-Brief.md`, `Phase-2` through `Phase-5-Brief.md`, and `Moving-Forward-Brief.md` (Phases 6–20, all built as of commit `497c25e`). Read those first for system context — this document is the next installment of the same construction queue.

---

## 0. Read this first

Same non-negotiable rules as `Moving-Forward-Brief.md` §0:

1. **Security is structural, not a checklist.**
2. **Business logic lives in the application layer** — DAL first, MCP tool second (if applicable), UI third.
3. **Do not anticipate.** Build the phase you're given, not the next one.
4. **Every new write capability gets an MCP tool risk tier at build time**, per `Phase-4-Brief.md`'s pattern.

This is a **queue of phases, not a single build.** Point a session at one numbered phase at a time. Several phases below have an unresolved question blocking a clean start — those are called out per-phase and collected in §9. Don't guess on those; ask Max first, especially §23 (real tax math) and §25 (undefined external tools).

---

## 1. Status snapshot (grounded in current code, not assumptions)

| Note (Max's wording) | Actual current state | Where |
|---|---|---|
| "Redo UI of Client portal to not be a list layout" | Portal home (`/portal`) is already a bento grid. Sub-pages (referrals, tools, meetings, documents) are single-column stacks of `gh-card` rows | §22.1 |
| "Embed fixes for reporting dashboard (currently js a link)" | Already an `<iframe>`, not a link — likely broken because the Looker Studio report isn't in embeddable form | §22.2 |
| "Toolstack should be toggle on/off" | Already toggleable, whole-section, via `FeatureToggle` on `/clients/[id]` (`tool_stack` is in `PORTAL_FEATURE_KEYS`) | §22.4 |
| "Is there any inbox triage infrastructure at all" | **Yes — fully built and live**, not a placeholder | §26 |
| "No option to sign to myself (max) [for tasks]" | Assignee dropdown only lists contractors; admins aren't selectable at all | §24.3 |
| "Master task view... add task button... works like Google Tasks" | No generic task-creation capability exists anywhere in the app today | §24.2 |
| "GrayScale," "Apexus," "Tempus," "Solus" | Zero references anywhere in the codebase except a placeholder `grayscale_page` feature key. All four are greenfield | §25 |

---

## 2. Phase 21 — Quick fixes

Independent, low-risk, no shared files with later phases.

### 21.1 Google OAuth "Error 401: invalid_client"
This is the dedicated Calendar/Tasks/Gmail OAuth client (`src/lib/google/oauth.ts`), a **separate** OAuth 2.0 client from Firebase Auth sign-in — don't confuse the two when debugging. `invalid_client` / "OAuth client was not found" means the client ID Google is being sent doesn't match a live OAuth 2.0 Web-application client in Google Cloud Console — it was deleted, belongs to the wrong project, or the secret holds a stale/placeholder value.

- `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` are empty in local `.env.local` (checked, not printed) — expected for local dev, but confirm the production values in Firebase Secret Manager (`apphosting.yaml` wires them via `secret:` refs) actually correspond to a live client.
- Fix is operational, not code: in Google Cloud Console (project backing `grayhorizon-grayportal`), verify/recreate a Web-application OAuth 2.0 client with `https://app.grayhorizon.nz/api/google/oauth/callback` as an authorized redirect URI, then `firebase apphosting:secrets:set GOOGLE_OAUTH_CLIENT_ID` (and SECRET/REDIRECT_URI) with the real values.
- Small code hardening while in this area: `/settings`'s "Connect Google" button should check these env vars server-side and show a clear "not configured" state instead of only surfacing Google's raw error after redirect.

### 21.2 Document naming for URL-linked documents
`clients/[id]/page.tsx`'s upload form defaults `docType` to `"other"` when a client pastes an `externalUrl` instead of uploading a file — and the `documents` table (`src/lib/db/schema.ts`) has **no title/label column at all**, so there's genuinely nothing to name it with today, not just a missing input.

- Add a `title` text column to `documents` (migration in `db/sql/`), nullable for existing rows.
- Add a required "Name this document" text input next to the `externalUrl` field.
- Display `title` (falling back to `docType`) everywhere documents are listed: client detail page, portal `/documents`.

### 21.3 Loading animation
Static review of `globals.css` (`gh-fade-up`, `gh-shimmer`, `gh-skeleton`) and `Skeleton.tsx` shows a structurally reasonable system, plus per-route `loading.tsx` files already exist for `(app)`, `deals/[id]`, `pipeline`, `vault`, and `portal`. Nothing jumps out as broken from the code alone — **first step is reproducing it in `npm run dev`** and getting a concrete description (which page, what it looks like vs. should look like: stutter, wrong position, doesn't fire, flash of blank content) before touching anything. Don't guess-fix this one.

### 21.4 Stop showing empty portal-home widgets
`src/app/(portal)/portal/page.tsx`: the `performance`, `account_team`, `campaign_health`, `deliverables`, and `activity_feed` widgets currently render whenever the feature flag is on (`has(key)`), and fall back to an "no data yet" placeholder row *inside* the widget rather than not rendering the widget at all. Change each to also require the underlying data array/snapshot list to be non-empty, e.g. `has("performance") && metricsSnapshots.length > 0`.

---

## 3. Phase 22 — Client portal UI

### 22.1 Move sub-pages off list layout
`referrals`, `tools`, `meetings`, `documents` pages under `(portal)/portal/` each render as a single-column stack of `gh-card` rows. Target: a grid/table treatment consistent with the home page's bento style. **Open question** (§9): what layout Max actually wants — needs a reference point before building, this is a visual-taste call, not a correctness one.

### 22.2 Reporting embed
Already an `<iframe src={lookerStudioUrl}>` in `portal/reporting/page.tsx` — the "it's just a link" read is almost certainly because the stored URL isn't in Looker Studio's embeddable form (report owner needs "Enable embedding" turned on under the report's sharing settings, and the URL needs the `/embed/` path variant) so the iframe silently fails. This matches an already-flagged open item in `Moving-Forward-Brief.md` §18.4.
- Normalize/validate `lookerStudioUrl` to the `/embed/` form when saved on the client edit form.
- If it isn't embeddable, show a clear "open in a new tab" fallback link instead of a dead iframe.
- Add a one-line hint on the client edit form about enabling embedding in Looker Studio.

### 22.3 Meeting summaries as their own pages
`portal/meetings/page.tsx` renders full summary text inline in the list. Add `portal/meetings/[id]/page.tsx`, turn each row into a `Link`. Mirror the same detail route on the admin side if one doesn't already exist.

### 22.4 Toolstack toggle — verify, don't rebuild
Whole-section on/off already exists (`FeatureToggle` on `/clients/[id]`, `tool_stack` is a `PORTAL_FEATURE_KEYS` entry). **Open question** (§9): confirm this already satisfies the note, or whether Max wants per-tool visibility within the stack — `toolStackItems` has a `current`/`planned` status enum today but no `visible`/`enabled` flag, so per-tool toggling would need a small schema addition.

### 22.5 Referrals tab revamp
Current state is minimal: two stat tiles (total referrals, active discount %), a flat list, a name+notes submit form. **Open question** (§9): what should the revamp add — reward tiers, a shareable referral link, richer status tracking? Don't build speculatively here.

### 22.6 General visual pass
Apply once 22.1's direction is confirmed, across all client-portal pages for consistency.

---

## 4. Phase 23 — Personal finance calculator

A new admin-only view (e.g. `/finance/personal`) — deliberately separate from the existing `/finance` page, which is explicitly scoped ("the only place Xero data appears... not a per-client display") to business-wide/client Xero rollups, not Max's personal split.

**Blocked on Max's actual rules before any code is written.** The note asks for "how much goes into tax savings, spending, business savings, and owners take" — this is real financial planning, not a cosmetic feature, and guessing NZ tax math wrong is actively harmful. Needed before scoping:
- Is this a fixed percentage split Max sets once, or an actual NZ tax-bracket/provisional-tax calculation?
- Sole trader or company structure? GST-registered?
- Does it read live figures from the existing Xero connection (`getBusinessFinancialRollup`), or is income entered manually?

Do not build a placeholder version with invented percentages.

---

## 5. Phase 24 — Task system overhaul

The largest single phase. Grounded in what's actually there today:

- `tasks` already carries `clientId` and `dealId`; `assignedTo` references `users.id`. Client-portal task views (`listPortalTasks`) already read the same clientId-scoped rows admins see — **"mirroring" is inherent to the existing data model**, not a sync mechanism that needs building.
- `listAllTasks()` (the admin "All" view) returns tasks with no client name attached, and `TaskRow.tsx` never displays one — matches Max's "task list should specify which client before any further information."
- **There is currently no generic task-creation capability anywhere.** Tasks are only ever created programmatically: deal stage rules (`dal/deals.ts`), client onboarding (`dal/onboarding.ts`), and recurring templates (`dal/recurringTemplates.ts`). No DAL insert function, no server action, no UI button exists for an ad-hoc "add a task."
- `TaskRow.tsx`'s assignee `<select>` is populated only from `listContractors()` — admin users (Max included) are never selectable, and an unassigned task just shows a bare "Unassigned" with no default to self.
- `portal/tasks/page.tsx` is read-only for clients today — no complete/edit action bound to the client role.

### Scope
24.1 **Client name first** — join client name into `listAllTasks()`, render it before the title in `TaskRow.tsx`'s admin "All" view.

24.2 **Generic task creation** — `createTask` in `dal/tasks.ts` (Zod input, `auditedInsert`, requires `clientId` + `title`, optional `dueDate`/`assignedTo`), a server action, and an "+ Add task" control. Give it an MCP risk tier per rule 4 in §0 if it's exposed as a tool.

24.3 **Assignee: admins selectable, default to self** — add a `listAssignableUsers()` (admins + contractors) to `dal/users.ts` (today only `listContractors()` exists); wire it into `TaskRow.tsx`'s dropdown; default a newly created task's `assignedTo` to the calling admin's own `userId` unless explicitly reassigned.

24.4 **Master Task View** — new admin page, Google-Tasks-style: one column per client (their task list), "+ Add task" at the top of each column, inline status/edit. Since every task already carries `clientId`, each column is `listAllTasks()` grouped by client — no new sync layer needed.

24.5 **Confirm the mirror is read vs. write** — once 24.2–24.4 land, a task created/edited in the master view is *the same row* the client already sees in their portal. **Open question** (§9): should clients be able to interact with (check off, comment on) their own tasks, or stay view-only as today? This changes 24.4's RLS/action surface, decide before building it.

---

## 6. Phase 25 — "GrayScale" additions

Framed as the umbrella Max's notes group these four under — **confirm that reading is correct before scoping** (§9). All four are greenfield; nothing named Apexus, Tempus, or Solus exists anywhere in the repo today.

### 25.1 Apexus — live quote tool
Expandable right-side panel on `/pricing` for building custom quotes. The pricing catalogue (`dal/pricing.ts`'s `serviceModules`/`serviceItems`) already exists and is exactly the data a quote builder would sum over. **Open question** (§9): is Apexus meant to be a client-side calculator over this existing catalogue (cheapest, most consistent build), or is it an existing external tool of Max's to integrate/embed? Don't scope further until this is answered.

### 25.2 "Powered by Solus" footer
Small addition — a footer line/logo in `(portal)/portal/layout.tsx`. Needs the Solus wordmark asset and link target from Max; otherwise a one-line text-only version is trivial to add now if he wants a placeholder.

### 25.3 Tempus (replaces Calendly)
Explicitly flagged by Max as a **later project** — leave it there. Also has a real dependency: booking needs to *write* calendar events, and Phase 3's Google Calendar sync is one-way by deliberate prior decision (`Moving-Forward-Brief.md` §17). That decision needs reopening before this phase can start, not just a UI build.

### 25.4 Suggested moves (last-contacted / client patterns)
Explicitly flagged by Max as a **later big project**. Same shape as the already-deferred AI Task Planner (Phase 20) — treat as deferred, not scheduled, until Max prioritizes it.

---

## 7. Phase 26 — Verify, don't build

**Inbox triage is real, live infrastructure**, not a placeholder taunting anyone: `src/app/(app)/inbox` + `dal/emails.ts`'s `listUnmatchedInboundEmails()` lists inbound mail that couldn't be matched to a contact by sender address, with match/dismiss actions. This is Phase 10, built. If mail isn't showing up as expected, that's a Gmail sync/webhook problem to diagnose separately — not a missing feature.

---

## 8. Suggested order

1. **Phase 21** (quick fixes) — no dependencies, do first.
2. **Phase 24** (task system) — highest daily-ops value, well-scoped from existing data model, only one open question (24.5).
3. **Phase 22** (portal UI) — needs Max's layout direction for 22.1/22.5 first; 22.2/22.3/22.4 can proceed independently.
4. **Phase 26** — a 15-minute verification pass, do whenever convenient.
5. **Phase 23** (personal finance) — blocked entirely on Max's rules; sequence whenever those are supplied.
6. **Phase 25** (GrayScale) — most open questions of any phase; sequence last, after answers land.

---

## 9. Open items for Max

1. **Loading animation** — which page, what's actually wrong (stutter / wrong position / doesn't fire / blank flash)?
2. **Google OAuth client** — need Google Cloud Console access confirmed to verify/recreate the Calendar/Tasks/Gmail OAuth client for the production project.
3. **Client portal list-layout redesign (22.1)** — grid, table, or something else? Reference mockup if one exists.
4. **Referrals tab revamp (22.5)** — what should it contain beyond the current stats + list + form?
5. **Toolstack toggle (22.4)** — does the existing whole-section toggle already satisfy this note, or is per-tool toggling wanted?
6. **Personal finance calculator (23)** — fixed % split or real NZ tax-bracket math? Sole trader or company? GST-registered? Manual entry or live from Xero?
7. **GrayScale (25)** — confirm it's the umbrella term for Apexus / Solus branding / Tempus / suggested-moves, or something else entirely.
8. **Apexus (25.1)** — a calculator over the existing pricing catalogue, or an external tool to integrate?
9. **Tempus (25.3)** — confirm scope/timing given the two-way Calendar sync dependency it reopens.
10. **Master task view (24.5)** — should clients be able to edit/complete their own tasks in the portal, or stay view-only?

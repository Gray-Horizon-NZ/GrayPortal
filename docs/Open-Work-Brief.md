# GrayPortal — Open Work Brief

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this document:** Every piece of system-development work still open, as of 2026-08-26. Everything in the original build queue (Phase 0–20) and the 2026-08-22 owner-review backlog (Phase 21–24) is built — see `Master-Brief.md` §4 for the feature inventory, git history for how any of it works. This file replaces the three separate briefs that used to track open work (`GrayScale-Brief.md`, `Email-System-Brief.md`, `Internal-Ideation-Brief.md`) — they've been merged here so there's one place to check, not three.

Companion to `Master-Brief.md` for system context.

---

## 0. Read this first

Same non-negotiable rules that applied to every phase before this one:

1. **Security is structural, not a checklist.**
2. **Business logic lives in the application layer** — DAL first, MCP tool second (if applicable), UI third.
3. **Do not anticipate.** Build the item you're given, not the next one.
4. **Every new write capability gets an MCP tool risk tier at build time**, per the pattern the MCP server phase established.

Point a session at one item at a time. Every item below has open questions blocking a clean start (collected in §7) — don't guess on those, ask Max first.

---

## 1. "GrayScale" product family

The umbrella Max's notes group these four under — **confirm that reading is correct before scoping** (§7). All four are greenfield; nothing named Apexus, Tempus, or Solus exists in the repo today beyond a placeholder `grayscale_page` feature key and a placeholder tile on the client portal's GrayScale page.

### 1.1 Apexus — live quote tool
Expandable right-side panel on `/pricing` for building custom quotes. The pricing catalogue (`dal/pricing.ts`'s `serviceModules`/`serviceItems`) already exists and is exactly the data a quote builder would sum over. **Open question** (§7): is Apexus meant to be a client-side calculator over this existing catalogue (cheapest, most consistent build), or is it an existing external tool of Max's to integrate/embed? Don't scope further until this is answered.

### 1.2 "Powered by Solus" footer
Shipped as part of the client portal redesign — every `/portal/*` page footer reads a Solus credit line (`src/components/portal/PortalShell.tsx`). The icon is a deliberate placeholder (`SolusMark()`, a plain brass ring-and-dot SVG), not a bug — there is no real Solus wordmark/icon asset in the repo. Needs the real asset and link target from Max to swap in.

### 1.3 Tempus (replaces Calendly)
Explicitly flagged by Max as a **later project** — leave it there. Also has a real dependency: booking needs to *write* calendar events, and the existing Google Calendar sync is one-way by deliberate prior decision. That decision needs reopening before this phase can start, not just a UI build.

### 1.4 Suggested moves (last-contacted / client patterns)
Explicitly flagged by Max as a **later big project**. Same shape as the already-built AI Task Planner but for relationship/contact-timing signals rather than tasks. Treat as deferred, not scheduled, until Max prioritizes it.

**Discovery, 2026-08-28** (found while fact-checking a discount figure for the onboarding wizard's GrayScale step — see §10.3): GrayScale is considerably less "unscoped" than this section implies. `OS/website/grayhorizon-website/grayscale/index.html` — the actual live marketing page — has a full real product catalogue with real pricing, structured JSON-LD and all: **Osseus** ($250/mo, the platform/CRM every other module plugs into), **Fidelis** ($340/mo, FMA-compliant advisor onboarding), **Apexus** ($220/mo, live quote calculator + e-signature — this actually answers §7 item 2, it's a real priced product, not a client-side calculator to build), **Aurum** ($240/mo, AI lead scoring), **Meridian** ($195/mo, revenue dashboards), **Stratum** ($420/mo, document-to-structured-data), **Memoria** ($380/mo, AI knowledge base), **Tempus** ($420/mo, bookings/scheduling), **Solus** ($190/mo, per-client branded portals — also answers what "Powered by Solus" in §1.2 actually refers to). The site also documents a real bundle discount: "10% off attached modules at 1–2 · 20% off at 3+" (i.e. buying multiple GrayScale modules alongside Osseus) — this is **not** the same thing as a "Gray Horizon client discount on GrayScale," which remains unconfirmed (see §10.3). Worth a real scoping pass against this live catalogue rather than treating §1 as a blank slate.

### 1.5 GrayScale request widget (client portal) — noted 2026-08-28, not scoped

Max's ask: a widget inside the client portal (not the admin app) letting a client request a specific GrayScale product from inside their own portal — same shape as the onboarding wizard's §4.2 "request portal access" pattern (client requests, doesn't self-provision), but for GrayScale products instead of portal logins. On submission: an email notification to Max, plus what Max called a "software notification" — read as the in-app `notifications` system (`src/lib/dal/notifications.ts`), i.e. both channels, not just email. Not scoped beyond this — needs: which of the catalogue above (§1.4's discovery) is actually requestable, where the widget lives in the portal nav, and whether it reuses `portalAccessRequests`' shape (client_id, product, status, decided_by) or is a new table.

---

## 2. Email marketing system

**Status:** Built, 2026-08-26 (the concurrent session referenced in the previous revision of this note was this build finishing up) — code complete, **not yet migrated against the live database** (`db/migrations/0024_short_mercury.sql`, `0025_military_masked_marvel.sql`, then `db/sql/025_email_campaigns.sql`, in that order — the auto-mode classifier blocked running this from the agent session directly, so it's queued for Max same as §3's chain was before it got applied). Not yet pushed either — held pending §3's already-committed, not-yet-pushed work so both land in one deploy, per Max. Scoped down from the plan below same day: this is for **notifying existing clients and prospects**, not newsletter-style marketing, so §2.3's opt-out/unsubscribe machinery was cut entirely — no `contacts.marketingOptOut`, no unsubscribe footer/link/token route, no `List-Unsubscribe` header, no `emailTemplates.kind` split. Two things also shipped beyond the plan below, both per follow-up requests the same day:

- **Inbox renamed to Email Triage** (`/email-triage`, was `/inbox`), with a second tab — **Client Emails** — showing every matched client conversation (inbound + outbound, joined through an active `clients` row) in one flat feed, separate from the Unmatched triage queue.
- **Multi-address contact matching.** A new `contactEmailAliases` table (`src/lib/db/schema.ts`) lets a contact who emails from more than one address (e.g. work + personal) still auto-match on inbound sync — taught either inline when manually matching an unmatched email ("remember this address"), or directly from the Client Emails tab ("+ add another address"). `syncInboundGmail`'s matching query checks both `contacts.email` and this table.

Everything else below — branded HTML templates, the audience/campaign model, the design shell, the Gmail adapter's multipart support, the throttled cron sender — was built as scoped.
**Intent:** Extend GrayPortal's existing Gmail-backed email (`Master-Brief.md` §4.4) from single-recipient transactional sends into a full communications tool — branded HTML templates with an enforced consistent design, and audience blast sends to clients (optionally prospects) — while keeping the current one-off compose path for genuinely personal messages.

### 2.1 Context and intent
GrayPortal already sends and logs email one contact/deal at a time (`src/lib/dal/emails.ts`'s `sendEmail`, Gmail via `src/lib/google/gmailAdapter.ts`, rate-limited to 30/hr, auto-logged as an Activity). Templates exist for recurring one-to-one sends (`emailTemplates` table, `{{var}}` substitution) but there is no bulk/audience send, no HTML rendering (Gmail adapter sends `text/plain` only), and no enforced visual consistency between emails — each is whatever plain text the sender typed.

Max's intent: this becomes the **primary tool for client email**, not an occasional blast feature bolted on. Templated, branded, tracked sends should be the default path for anything that isn't a genuinely one-off personal note — proposal follow-ups, onboarding, report delivery, re-engagement, announcements. Direct compose stays available for the exception case, not as the default way email gets sent.

Two capabilities are being added on top of the existing single-send path:
1. **Branded templates** — created in-app or uploaded, all rendering inside one enforced design shell so output is visually consistent regardless of who wrote the body copy.
2. **Blast sends** — one template (or ad hoc content) sent to an audience: clients by default, optionally clients + prospects via a toggle.

### 2.2 Audience model
Two audience types, resolved from existing tables — no new CRM concepts:

- **Clients** — contacts belonging to a company that has an active (non-deleted) `clients` row. Default, always-available audience.
- **Prospects** (opt-in via toggle, off by default) — contacts belonging to a company with an open deal (`stage` not `Lost`/`Dormant`, not yet linked to a `clients` row). Confirmed with Max: this is pipeline contacts, not "every non-client contact" — dormant/lost companies are excluded even with the toggle on.

Both audiences exclude: soft-deleted contacts/companies/deals, contacts with no email on file, and any contact marked opted-out (§2.3). A campaign always resolves its recipient list at send time, not at draft time, so a contact added to a company after the draft was created is still included when it actually sends.

### 2.3 Consent and compliance (NZ Unsolicited Electronic Messages Act 2007)
Commercial email to prospects is legally distinct from transactional/relationship email to existing clients. Since the prospects toggle sends to people without an existing client relationship, this needs to be structural, not a checklist step someone can skip:

- Add `contacts.marketingOptOut boolean not null default false`. Every blast (client or prospect audience) excludes opted-out contacts at the DAL query level, not just in the UI.
- Every blast email — never transactional single sends — carries a footer with the business's identity and a working unsubscribe link (§2.6 design shell), consistent with the Act's sender-identification and unsubscribe requirements. Clicking it sets `marketingOptOut = true` via an unauthenticated token-based route (mirroring how portal magic-link style tokens already work elsewhere in the app) — no login required to opt out.
- Prospect blasts should only go to contacts with a genuine existing relationship (a company you've had contact with — which an open deal already implies), never a purchased/cold list. GrayPortal has no bulk-import path today (§7 rules this out), so this risk is already structurally limited — worth stating here so it isn't accidentally reopened.

### 2.4 Design system for emails (structural consistency, not a style guide)
Per the app's own principle ("security is structural" — `Master-Brief.md` §3), visual consistency should be enforced by the render path, not documented as a guideline someone has to remember. Concretely:

- A single new module, e.g. `src/lib/email/chrome.ts`, exports the brand constants email clients can actually render (hex values, not CSS custom properties — email HTML has no reliable support for `var()`) and a `wrapEmailHtml(bodyHtml, opts)` function that every send — template or ad hoc — passes through before it reaches the Gmail adapter. No caller can construct raw outbound HTML without going through the shell.
- Palette: reuse the existing gold accent (`#b8a369`) and the site's neutral ramp, but **on a light background** for the email body — dark-background HTML is unreliably rendered across Outlook/Gmail/Apple Mail and many clients read/print email in light mode regardless of app theme. Deliberate departure from the app's dark-first UI, scoped to email only. (Open question for Max, §7.)
- Type: web-safe stack only — `Georgia, 'Times New Roman', serif` standing in for Cormorant Garamond's display role (headings only), `-apple-system, Segoe UI, Roboto, Arial, sans-serif` standing in for DM Sans body text. Custom `@font-face` in email is unreliable enough to skip rather than half-support.
- Layout: single-column, max-width ~600px, table-based structure (most reliably-rendered approach across clients), inline styles only (no `<style>` blocks — many clients strip `<head>`).
- Fixed chrome: header with Gray Horizon wordmark/logo (reuse `clients.logoUrl`-style public Storage URL pattern for the sender's own logo asset), a single primary-action button style (solid gold fill, square corners — matches `--gh-radius: 0`), and a footer carrying business identity + unsubscribe link (§2.3) on every blast send.
- Geometry: square corners everywhere (matches the app-wide `border-radius: 0` rule) — one of the few brand rules that *does* translate reliably into email HTML.

### 2.5 Data model changes
- `contacts`: add `marketingOptOut boolean not null default false` (§2.3).
- `emailTemplates`: add `htmlBody text` (rendered body; existing `body` becomes the plain-text fallback for `multipart/alternative`) and `kind` enum (`"transactional" | "campaign"`) so the template picker in a campaign only offers blast-appropriate templates, and one-off compose isn't cluttered with campaign-only content.
- New `emailCampaigns` table: `id, name, templateId (nullable — ad hoc content allowed), subject, htmlBody, audience ("clients" | "clients_and_prospects"), status ("draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled"), scheduledFor (nullable), sentAt, createdBy/updatedBy, soft delete`.
- New `campaignRecipients` table: `id, campaignId, contactId, status ("queued" | "sent" | "failed" | "skipped_optout"), gmailMessageId (nullable), error (nullable), sentAt (nullable)`. This is what makes sending resumable and auditable per-recipient, and is what the throttled cron sender (§2.7) iterates over.

### 2.6 Gmail adapter changes
`src/lib/google/gmailAdapter.ts`'s `buildRawMessage` currently only builds `text/plain`. Extend it to build `multipart/alternative` (plain-text fallback + HTML part) when an HTML body is supplied, and add a `List-Unsubscribe` header on campaign sends (both a mailto and the unsubscribe-link URL from §2.3 — the header itself is also a deliverability signal to receiving mail servers, separate from the visible footer link). Stays inside the existing single adapter module — no new external dependency, same posture as the rest of the app ("one adapter per external system," `Master-Brief.md` §3).

### 2.7 Send mechanism and throttling
Direct one-off sends (`sendEmail`) keep the existing 30/hr limit unchanged. Campaign sends need a **separate, smaller throttle** running on its own cadence, for two reasons: it shares the same Gmail account/quota as every other send this tool makes, and un-throttled bulk send from a single Gmail account reads as spam to receiving servers regardless of content.

- New cron route `api/cron/run-email-campaigns`, same pattern as `api/cron/run-recurring-templates`. Each run processes a small batch (e.g. 15–20) of `queued` `campaignRecipients` rows across all `sending`-status campaigns, sends each via the extended adapter, updates recipient status, and logs an `emails` row + `activities` row per recipient exactly as `sendEmail` does today (so campaign sends show up in a contact's activity history identically to a one-off email).
- A campaign moves `draft → scheduled` (if `scheduledFor` set) or `draft → sending` (send now) once the audience is resolved and `campaignRecipients` rows are queued; the cron route only acts on `sending`-status campaigns whose `scheduledFor` (if any) has passed.
- Actual safe batch size/day depends on whether the connected Gmail account is a personal account or Google Workspace (materially different daily send caps) — open question for Max, §7.

### 2.8 DAL, UI, and MCP surface
- New `src/lib/dal/campaigns.ts`: `createCampaignDraft`, `listCampaigns`, `updateCampaignDraft`, `resolveAudience(audience)` (implements §2.2's queries), `queueCampaignSend` (resolves audience → inserts `campaignRecipients`, flips status), `previewCampaignForContact` (renders one recipient's merge through `wrapEmailHtml` for review before sending), `cancelCampaign`. Admin-only (`assertRole(caller, "admin")`), audited inserts/updates via the existing `mutate.ts` helpers — same shape as `recurringTemplates.ts`.
- Extend `src/app/(app)/email-templates/`: add HTML template creation (rich body field or raw-HTML upload with sanitization — strip `<script>`, external `<style>`, and `on*` attributes before storing), and a live preview (rendered through `wrapEmailHtml`) so what's saved is what a recipient will actually see.
- New `src/app/(app)/email-campaigns/`: list + draft creator (pick template or ad hoc content, audience toggle, schedule-or-send-now, live preview), per-campaign recipient status view (queued/sent/failed counts, per-row detail for failures).
- MCP: per `Master-Brief.md` §3's rule that every write capability gets a tier at design time — `createCampaignDraft`/`updateCampaignDraft` are medium-risk (draft-only, no send), `queueCampaignSend` is high-risk / always-confirm, matching the `onboardClient()` precedent for irreversible-ish, high-blast-radius actions.

### 2.9 Explicitly out of scope
- No third-party ESP (Mailchimp/SendGrid/etc.) — stays on the existing Gmail adapter, consistent with the one-adapter-per-external-system rule and avoiding a new vendor dependency for what a throttled cron job can do.
- No bulk contact/list import — audiences are always resolved from existing CRM data, never an uploaded list.
- No visual template builder/drag-and-drop editor — templates are HTML (hand-written or uploaded) rendered through the fixed design shell (§2.4), matching the app's existing "no general workflow/automation builder" posture — a fixed, well-designed shell beats a configurable one at this scale.

### 2.10 Suggested build sequence
1. Compliance + data model: `marketingOptOut`, `emailTemplates.htmlBody`/`kind`, the two new tables.
2. HTML rendering: `chrome.ts` design shell, adapter `multipart/alternative` support.
3. Template system: HTML create/upload/preview in the existing templates UI.
4. Campaign DAL + throttled cron sender.
5. Campaign UI (compose, audience, schedule, send, per-recipient status).
6. MCP tool exposure.
7. Seed starter templates (fast-follow, content drafted with Max separately — proposal follow-up, onboarding welcome, report delivery, re-engagement/win-back, referral ask are the likely first set).

---

## 3. Internal Ideation tab (+ AI Agents tab)

**Status:** Built and fully migrated against the live database as of 2026-08-26 — **not yet deployed**. Code is committed locally on `main` (commit `3261c55`, not pushed) and the full database migration chain (`db/migrations/0022`+`0023`, `db/sql/022`–`024`) has been applied and verified directly against the live Neon database. Nothing further is needed on the DB side. The only remaining step is a `git push` to `origin/main` — Max asked to hold that until a separate, concurrent session (see §2) finishes its own work, so both land in the same deploy. Two things shipped beyond the original scope below, both per follow-up requests the same day:

- **Ideation categories are now Settings-managed, not a fixed code list.** §3.2's original "extensible app-layer registry" plan (edit an array in code to add a category) was superseded — there's now a real `ideation_categories` table, an admin-only "Ideation categories" section on `/settings` to add new ones freely, and the Ideation page renders one column per *currently active* category rather than a hardcoded pair. `src/lib/dal/ideation.ts`'s `createIdeationCategory`/`listIdeationCategories`, `src/app/(app)/settings/page.tsx` (`Ideation categories` section), `db/sql/023_ideation_categories.sql` (admin-only RLS + seeds the original `software`/`marketing` rows so existing data keeps resolving). No deletion UI — only adding, per what was actually asked.
- **A new AI Agents tab**, same visual design as Ideation (column-per-status cards) but grouped by a fixed 3-stage lifecycle instead of an open category list, since these are inherent pipeline stages, not tags: Active/Published, In Development, Planned/Ideated. Its own top-level nav item next to Ideation, admin-only. New table `ai_agents` (`src/lib/dal/aiAgents.ts`, `src/app/(app)/ai-agents/`, `db/sql/024_ai_agents.sql`).

A useful discovery mid-build: `0022`/`022` (the original Ideation-tab migration+RLS) turned out to already be hand-applied to production from an earlier session — visible in git log as the "verify hand-applied migration" commits. Confirmed via a direct query against `information_schema` before reapplying anything, rather than assuming either way — worth doing that check again if picking this up cold, since git commits and DB state can drift independently in this repo (code merges don't auto-run migrations here; see `README.md`'s Deploy model section).

### 3.1 The idea
A tab for Max's own internal/business ideas — distinct from the existing **client** ideation feature (`src/lib/dal/ideation.ts`, `listIdeationItems(clientId)`), which is strictly per-client and shown on each client's detail page and portal. This is business-wide, not tied to any client, and lives in the admin (app) shell only — never client-visible.

### 3.2 Decided direction (2026-08-26)
- **Reuse the existing ideation data model** (`ideationItems` table / `src/lib/dal/ideation.ts`) rather than a separate feature — same title/description/status shape, scoped with `clientId: null` for internal ideas.
- **Its own top-level nav item**, not folded into an existing admin page — a new entry in `src/app/(app)/layout.tsx`'s `navItems` list (admin-only, same pattern as Pipeline/Vault/Reminders further down that list), pointing at a new `src/app/(app)/ideation/page.tsx`.
- **Status tracking only** — no conversion into a roadmap item or deal. The existing `ideationStatusEnum` (`new | under_review | actioned | archived`) already covers this; no new workflow states needed.
- **Categorized: Software vs. Marketing.** Every idea is tagged with a category, and the category drives how cards are grouped/filtered on the Ideation page itself (e.g. a Software column and a Marketing column, or a filter toggle) — it has no effect outside that one page; a "software" idea doesn't surface near GrayScale or anywhere else. The category list is an **extensible app-layer registry**, not a database enum — same reasoning and same pattern as `PORTAL_FEATURE_KEYS` in `src/lib/dal/clients.ts` ("so new features/categories don't need a migration"). Starts with `software` and `marketing`; a third category later is a small code change, not a schema migration.

### 3.3 Build notes (things the build session needs to handle, not decisions left open)
- **Schema change required:** `ideationItems.clientId` is currently `notNull().references(() => clients.id)` (`src/lib/db/schema.ts`) — it needs to become nullable to hold internal (no-client) ideas. Add the new `category` column alongside it (text/varchar, validated against the app-layer registry, not a `pgEnum`).
- **RLS gotcha to handle deliberately, not by accident:** `ideation_items_scoped`'s current policy (`db/sql/008`/`013`) grants **both** `admin` and `contractor` roles unconditional full access to every row, regardless of `client_id` — only the `client` role is actually scoped. Left as-is, that policy would make Max's internal business ideas visible to the contractor portal too, which cuts against the app's general contractor-scoping principle ("assigned tasks and non-commercial context only" — `Master-Brief.md` §2). Recommended default: tighten the policy so `client_id IS NULL` rows are admin-only, excluding contractor — flag this explicitly in review rather than inheriting the existing wide-open admin/contractor clause silently.
- **DAL:** extend `IdeationItemInput` in `src/lib/dal/ideation.ts` to accept `clientId: z.string().uuid().nullable()` and a `category` field; add a listing function for internal (null-client) items alongside the existing per-client `listIdeationItems(clientId)`.
- No MCP tool exposure implied here — the existing ideation DAL has none today, and nothing above changes that posture.

---

## 4. Client onboarding journey

**Status:** Partially built as of 2026-08-27 — see §10 for exactly what shipped, what's live, and what's still open. Foundation (token/invite mechanism), the wizard shell, and all 7 steps are in place, though steps 4 (documents) and 6 (GrayScale) are UI-only mocks, not wired to real backends (§10.3). §4.6's admin checklist is unbuilt.
**Ask:** After a client is onboarded, an automated journey should email them a link to their portal, let them choose which Google account(s) get portal access, and walk them through the portal on first login.

### 4.1 Current state
`onboardClient()` (`src/lib/dal/onboarding.ts`) already does the transactional part — creates the company, client, one `clients_features` row set, one portal `users` row for a single admin-entered email, and a starter task list — but it's entirely a backstage admin action: **no email is ever sent to the client**, there's no portal link, no account-selection step, and no first-login walkthrough anywhere in the codebase. The admin form (`src/app/(app)/clients/onboard/`) takes one email and that's the entire "invite."

Separately, `inviteClientUser()` (`src/lib/dal/users.ts`) already lets an admin add *additional* portal logins to an existing client, one at a time — but it's admin-only by explicit, signed-off design: the comment on it states plainly *"Admin-invite is the only client-claiming mechanism (Phase 2 brief §3, signed off): no self-registration path exists anywhere in this app."*

### 4.2 Decided direction (2026-08-26)
Confirmed: this is an extension of the existing onboarding workflow (`onboardClient()`), not a separate system — same email-then-link entry point described in §4.1. Access model, verification, approval, and the wizard UI are all now decided:

- **Access model: request, not self-service creation.** The client doesn't directly create logins — they *request* access for a given Google account. Every request queues for **Max's explicit approval** before the `users` row is created/activated — this is what keeps Phase 2's "admin-invite is the only client-claiming mechanism, no self-registration path" decision intact rather than reopening it: the client can only ever *ask*, never mint a login unilaterally.
- **No live Google-account verification.** Decided against building any check (MX-record, format-based, or otherwise) on whether the requested address is a real/working Google account — out of scope. The request step just captures the email as typed; the actual account gets validated the normal way, on that person's first real sign-in (`claimOrVerifyAllowlist`), exactly as it works today.
- **Approval surfaces as a notification, through the existing system.** A submitted request notifies Max via the app's existing unified in-app + email notification framework (`Master-Brief.md` §4.4) — not a bespoke alert channel — and respects whatever notification preferences Max already has configured there.
- **A second notification on completion.** When a client finishes the onboarding wizard (walkthrough steps done, portal reached), send a completion email to **both Max and the client** confirming onboarding is done. Exact trigger moment — end of the wizard steps themselves, vs. the client's first actual sign-in into the live portal that follows it — still needs pinning down (§7, item 13), since those could be two different instants.
- **Walkthrough is a wizard**, not passive portal exploration — see §4.3 for the agreed layout.

### 4.3 Walkthrough wizard UI — decided shape
Reached via the emailed portal-setup link (§4.1's token-gated entry point). Multi-step, simplified/linear, not the full portal chrome — a dedicated wizard, not a tour bolted onto the real portal UI. Linear, one screen per step, Next-only progression (no free jumping between steps) — the "luxury firm, first impression" brief this is being designed against (2026-08-26) calls for unhurried, one-idea-per-screen pacing over a dense multi-field intake form.

- **Left panel** (fixed across every step): darker background, Gray Horizon logo, "Welcome, [Client Name]." Sets identity/orientation once; doesn't change between steps.
- **Right panel**: dark gray, holds the actual step content — questions, explanations, and the account-access-request step (§4.2) live here, changing per step.
- **Step indicator**: restrained, e.g. "03 / 07" in the app's existing eyebrow micro-type — not a filled progress bar, not gamified (no confetti, no "Step 3 of 7! 🎉").

**Decided step order (2026-08-26):**
1. **Welcome** — tone-setting, one warm line, no bulleted itinerary of what's ahead.
2. **Confirm your details** — business name, main email, phone, position, address, postal address (if different), referred-by (if any). Pre-filled from what `onboardClient()` already captured, framed as "here's what we have — tell us if anything's changed," not a blank form. **New fields needed**: phone/position/address/postal-address/referred-by don't exist on `companies`/`contacts` today — small schema addition, not yet designed.
3. **Request portal access** — the account-access-request step from §4.2.
4. **Your documents** — the four documents from §4.5 (Welcome, Project Brief, Delivery Guide, Thank You), presented together on one screen as a set, not spread across four pages. Caption note under the set: these stay available afterward under the portal's own Documents section. Exact tile visual spec (2026-08-26):
   - Fixed-width rectangles, all matching, so the row reads as a clean aligned set.
   - Rounded corners, gold outline, translucent dark-gray fill.
   - Single line of text only (e.g. "Welcome Document"), left-aligned inside the tile, no wrapping.
   - *(Rounded corners are a deliberate one-off departure from the app-wide `--gh-radius: 0` square-corner rule — flagged, not overridden; the wizard is already its own separate shell so this is a real, isolated choice, not an accident.)*
5. **Your services** — what's currently agreed, pulled live from `clientServices`, not static copy.
6. **GrayScale discount** — final step before entering the portal; closes on something exclusive/forward-looking rather than a flat "you're done."
7. **Enter Client Portal** button → loading transition → real portal. Loading animation (2026-08-26): a ring with a glowing gold arc, spinning semi-slowly — not a generic spinner. Runs a few seconds (this only ever happens once per client, so it's allowed to feel ceremonial rather than fast) before landing them in `<PortalShell>` for real.

### 4.4 Open questions
See §7 (added there as items 9–13).

### 4.5 Onboarding documents (added 2026-08-26)

Every onboarded client needs four documents, supplied on top of the wizard walkthrough itself, and they must be **immediately available on the client's portal** from onboarding — not something added later by hand:

1. Welcome Doc
2. Project Brief
3. Delivery Guide
4. Thank You Doc

**Template design is explicitly out of scope for GrayPortal work** — Max has a separate designer agent producing the actual document templates. What GrayPortal needs to build is the mechanism: how these four get attached to a client during onboarding and show up in their portal immediately.

Likely implementation path (not decided, just the obvious fit): this is the existing Documents feature, not a new system. `documents` table + `docTypeEnum` (`src/lib/db/schema.ts`) currently has `["proposal", "contract", "deck", "other"]` — none of the four fit, so this needs either four new enum values (`welcome`, `project_brief`, `delivery_guide`, `thank_you`) or a way to flag these four as a distinct "onboarding doc" set distinguishable from ad hoc documents. `uploadDocument`/`linkDocument` (`src/lib/dal/documents.ts`) already handle admin-side attach (upload or an external URL — likely how designer-produced docs land here, e.g. a Drive link), and `listPortalDocuments`/`/portal/files` (`src/lib/dal/portal.ts`, `src/app/(portal)/portal/files/page.tsx`) already give clients read+download access — both reusable as-is. What's missing: a step (wizard-driven or admin-checklist-driven, see §4.6) that prompts attaching all four during onboarding, distinct from documents.

### 4.6 Expanded admin onboarding checklist (added 2026-08-26)

Separate from the client-facing wizard (§4.3): a checklist **for Max**, triggered when a client signs, replacing the current `ONBOARDING_TASK_TEMPLATE` (`src/config/onboarding.ts` — today just "Kickoff call," "Gather brand assets and access," "Confirm client portal access"). The new list, as given:

- Add MSA to client portal
- Connect invoice/Xero contact to client portal
- Client Portal: Occupy Roadmap
- Client Portal: add any current/discussed strategies
- Client Portal: Fill in current tasks
- Client Portal: add meeting summaries
- Client Portal: Fill credentials
- Client Portal: fill toolstack
- Setup Looker Studio and connect to client portal
- Run website SEO growth auditor, and add to client portal

Nearly every item maps directly onto an existing GrayPortal feature — this checklist is essentially "don't forget to actually populate what's already built" for a new client, one task per section: MSA → Documents (§4.5's mechanism, `docType: "contract"` or similar), Xero → `clients.xeroContactId` (deliberately admin-set, never auto-matched, per its own schema comment), Roadmap → existing Roadmap feature (`listRoadmapItems`/`createRoadmapItem`), strategies → likely the existing per-client Ideation feature (`listIdeationItems`, distinct from the internal §3 Ideation tab) or a new concept — needs confirming which, current tasks → the Tasks feature itself, meeting summaries → existing Meeting Summaries feature, credentials → existing Credential Vault, toolstack → existing Tool Stack feature, Looker Studio → `clients.lookerStudioUrl` (already a field, just needs setting). **"Run website SEO growth auditor" is the one item with no existing equivalent anywhere in the codebase** — grepped, nothing — this is either a manual/external process being tracked as a task, or a genuinely new capability; needs clarifying which before scoping it as a build item.

**Open tension to resolve before building, not yet asked:** earlier this session Max chose "the wizard's own steps replace `ONBOARDING_TASK_TEMPLATE`" when the two were assumed to be the same thing. Given this checklist is admin-facing operational tasks (not client-facing wizard steps), it's probably a *separate* replacement of `ONBOARDING_TASK_TEMPLATE` sitting alongside the client wizard, not something the wizard itself subsumes — but confirm this reading with Max rather than assuming it.

---

## 5. Client portal variations (marketing/service vs. software-only)

**Status:** Not scoped, not started — added 2026-08-26 per Max's request.
**Ask:** Two distinct portal experiences — one for marketing/service clients (what exists today) and a second, visually distinct one for clients who only have a Gray Horizon software subscription (no marketing/service relationship). Different focus, different look.

### 5.1 Current state
The portal is a single shell (`PortalShell`, `portal-theme.css`) with one nav/theme for every client. Content is already feature-flag driven per client via the `client_features` toggle registry (`PORTAL_FEATURE_KEYS` in `src/lib/dal/clients.ts` — `tasks`, `documents`, `referrals`, `roadmap`, `meeting_summaries`, `campaign_health`, `deliverables`, etc.), and `portal/layout.tsx` already builds nav sections conditionally from whichever keys are enabled. So *hiding* marketing-specific sections for a given client is mostly already possible today. What doesn't exist: any concept of a client "type"/segment in the schema, a second visual template, or any content model at all for what a subscription-focused client would actually need to see (subscription/plan status, product usage, release notes, support — none of these are modeled anywhere).

### 5.2 Decided direction (2026-08-26)
Confirmed as a straightforward binary template switch, not a blended system:

- **Every client is exactly one type — service-focused or subscription-focused.** No hybrid/blended portal for a client that's genuinely both; whichever type is picked is the whole portal experience for that client.
- **The type is chosen by Max as the first question when onboarding a client into the system** — a new field on `onboardClient()`'s input (§4), decided before any of the rest of that client's portal setup (feature toggles, etc.), and it determines the rest of that client's layout and available options from that point on.
- **This is a real second template**, not just an accent-color variant reachable through the existing feature-toggle registry — confirms the "new content model + new layout" reading in §5.3 below, not the lighter-weight "toggle it off" option.
- Whether "GrayScale subscriber" is specifically what "subscription-focused" means, or a broader software-subscription category that could exist independent of GrayScale (§1) shipping, still needs pinning down (§7, item 14) — it shapes what the subscription-focused content model (§5.3) actually needs to contain.

### 5.3 What's actually new here (beyond feature toggles)
- **A client type field** (e.g. `clients.portalType: "service" | "subscription"`) captured at onboarding time (§5.2) — this doesn't exist today, and needs adding to `onboardClient()`'s input alongside the work in §4.
- **A second visual template.** The current dark-first monochrome system (`portal-theme.css`) is scoped under `.ghp-root`; a second template needs its own variant living the same way, without touching the service-focused look. How different it needs to be — a distinct accent/palette within the same design language, vs. a materially different layout — is still open (§7, item 16).
- **A real content model for the subscription-focused template** — subscription/plan tier, billing status, product usage, changelog/release notes, support — none of which exist as entities today. This is new data modeling, not a toggle flip, and depends on item 17 above.
- **Layout/shell branching** — `portal/layout.tsx` would need to pick template + nav set based on `clients.portalType`, not just filter sections within one fixed shell as it does now.

### 5.4 Open questions
See §7 (added there as items 14–16).

---

## 6. Deferred, not scheduled

Ideas deliberately deferred rather than scheduled — don't build without Max explicitly prioritizing:

- General workflow/automation engine
- AI Calendar Assistant, AI Docs Assistant
- Agreement/contract e-signature generation
- Agent Inbox

(Tempus and Suggested moves above are also in this deferred category, but tracked with their own numbered sections since they're part of the named GrayScale family.)

---

## 7. Open questions for Max

**GrayScale:**
1. Confirm "GrayScale" is the umbrella term for Apexus / Solus branding / Tempus / suggested-moves, or something else entirely.
2. Apexus — a calculator over the existing pricing catalogue, or an external tool to integrate?
3. Solus — real wordmark/icon asset and link target, to replace the current placeholder.
4. Tempus — confirm scope/timing given the two-way Calendar sync dependency it reopens.

**Email marketing:**
5. Gmail account type — personal Gmail or Google Workspace? Sets the realistic safe batch size/day for the throttle (§2.7).
6. Light-background email design (§2.4) — confirm the light/editorial email variant over the app's dark-first theme, since dark HTML email is unreliable across clients.
7. Open/click tracking — worth a basic open-rate signal (tracking pixel) for blast sends, or explicitly skip it? Adds real complexity (hosting a pixel endpoint, privacy considerations) — recommend skipping for v1 unless it's a real need.
8. Existing prospect contacts and consent — do current pipeline contacts have a sufficient existing-relationship basis to receive a first blast under §2.3, or should the first prospect send be preceded by some explicit opt-in step?

**Client onboarding journey:** items 9/10/12/13 settled (§9.2, §10) — review/edit step before send (built), 14-day token with admin resend (built), §4.6's admin checklist is the real `ONBOARDING_TASK_TEMPLATE` replacement, not the wizard (wizard stays client-facing only), completion email fires on first real sign-in (not yet built — needs a `claimOrVerifyAllowlist` hook). Item 11 settled for the 5 steps actually built (§10.2); still open for steps 4 (documents) and 6 (GrayScale discount), and for §4.6's checklist itself, which is unbuilt.

**Client portal variations:**
14. Naming/scope of "subscription-focused" (§5.2) — specifically GrayScale (Apexus/Tempus/Solus) subscribers, or a broader software-subscription category that doesn't strictly depend on §1's GrayScale build? Shapes what the content model in item 15 needs to contain.
15. What does the subscription-focused template actually need to show — subscription/plan tier, billing status, product usage, changelog/release notes, support/tickets? Which are real launch requirements vs. later nice-to-haves?
16. How different should the look be — a distinct accent/palette variant within the existing dark-first monochrome system, or a materially different layout?

---

## 8. Resolved (no longer tracked)

- **Google OAuth `Error 401: invalid_client`** — fixed 2026-08-25. Calendar/Tasks/Gmail integrations are live in production.
- Everything from the original Phase 0–20 build queue and the 2026-08-22 owner-review backlog (Phase 21–24). See git history / current code for how any of it works now — `Master-Brief.md` §4 has the feature inventory.

---

## 9. Session handoff — 2026-08-26

For a session picking this up cold. Everything below happened in one day, across two concurrent Claude Code sessions against this same repo — check current code/git log before trusting anything here over what you actually see, but this should save you re-deriving context.

### 9.1 What actually shipped today

Two sessions ran concurrently: one built §3 (Ideation categories + AI Agents tab), one built §2 (email marketing system + Email Triage rename, replacing the old `/inbox`). Both are **fully built, migrated against the live database, and deployed to production** — `git log`: `3261c55` (Ideation/AI Agents) then `8104cac` (email marketing), both on `origin/main`. Firebase App Hosting auto-deploys on push to `main`; confirmed landed via `firebase apphosting:backends:get grayportal --project grayhorizon-grayportal` (there's no `apphosting:rollouts:list`, only `:create` for rollback — `:get` is the way to check a deploy actually landed, look at "Updated Date"). Do not re-scope or re-build either feature — read the current code first if anything here seems off.

After deploy, Max found and this session fixed three real usage gaps (also deployed, or ready to deploy — check git status):
- **Ideation categories had no delete UI.** Added `softDeleteIdeationCategory` (`src/lib/dal/ideation.ts`), wired into Settings' "Ideation categories" section. Safe to delete a category with items still tagged under it — the Ideation page's own pre-existing "Other" fallback column (`src/app/(app)/ideation/page.tsx`) already catches orphaned items, nothing disappears.
- **No way to add a contact's secondary email address without an existing matched-email row.** The Client Emails tab's "+ add another address" only worked per-row on an already-matched email — useless for a contact who hasn't emailed yet. Added a proper form directly on the client detail page's Emails section (`src/app/(app)/clients/[id]/page.tsx`) — a `<select>` of that client's own contacts (from `getCompany(client.companyId).contacts`, no search needed since it's scoped to one client's small contact list) + an email input, calling the existing `addContactEmailAlias` DAL function via a new `addClientContactEmailAliasAction` (`src/app/(app)/clients/actions.ts`).
- **Ideation/AI Agents columns read as one flat list**, hard to visually scan. Both pages (`src/app/(app)/ideation/page.tsx`, `src/app/(app)/ai-agents/page.tsx`) now give each individual item its own nested callout (`background: var(--gh-surface-raised)`, `border: 1px solid var(--gh-border-strong)`, `border-radius: var(--gh-radius)`) instead of a plain `border-bottom` separator — matches the existing Pipeline board's own column/card layering (`.gh-pipeline-col` holding individual `.gh-card` deal cards, `globals.css` ~line 1076).

### 9.2 Paused: Client onboarding journey wizard (§4 above)

Started scoping, not built. Decisions Max made this session, on top of §4.2/§4.3's already-decided shape:
- Invite email gets a review/edit step before sending — **not** automatic the instant `onboardClient()` runs (settles §7 item 9).
- The wizard's own steps **replace** `ONBOARDING_TASK_TEMPLATE` (`src/config/onboarding.ts`) — the old starter-task auto-generation goes away once this ships (settles §7 item 12).
- The "onboarding complete" notification fires on the client's **first real portal sign-in**, not at the end of the wizard's own steps (settles §7 item 13).
- Wizard needs more steps than §4.3 originally sketched — Max asked for an **initial documents** step and general **onboarding process** content, exact shape still undefined (§7 item 11 still open, now with more surface area).

Research this session did NOT find infrastructure the brief assumes exists — worth knowing before scoping further:
- **No token/magic-link mechanism exists anywhere in this app**, despite §4.3's "token-gated entry point" phrasing. Exhaustively grepped `src/app/api`, `proxy.ts`, `schema.ts`, all migrations. Building the wizard's emailed portal-setup link means new infrastructure from scratch: a token-bearing table (or building on `users.googleUid IS NULL`, the one real "not yet claimed" signal that exists today via `claimOrVerifyAllowlist`, `src/lib/dal/allowlist.ts`), a new unauthenticated route class in `proxy.ts`, expiry/reissue logic (§7 item 10, still fully open).
- **Notifications are in-app only.** The `notifications` table's own schema comment says so directly — `generateNotifications()` (`src/lib/dal/notifications.ts`) only ever does a bare row insert, nothing calls `sendGmail`/`sendEmail`. §4.2's "existing unified in-app + email notification framework" and "respects whatever notification preferences Max already has configured" are both aspirational — no email path, no preferences mechanism exists at all. Simplest fix: skip the notifications table for the wizard's approval/completion emails entirely and send them straight through `sendEmail`/`wrapEmailHtml` (the same path campaigns already use), rather than building notification-email infra as a side quest.
- **Documents are ready to reuse for an admin-attaches-starter-docs step** — `uploadDocument`/`linkDocument` (`src/lib/dal/documents.ts`), Firebase Storage + signed URLs, and working portal-side read/download (`listPortalDocuments`, `/portal/files`) all already exist. If Max instead wants the *client* to upload something during the wizard, that's new — today the portal is read+download only, zero client-side write path.
- **`PortalShell.tsx` is not reusable/parameterizable** for the wizard — it's a hard-wired single layout, and this codebase's own established pattern is one physically separate shell component per distinct chrome, not a shared parameterized one. Reuse the `--ghp-*` CSS token system (colors/spacing/fonts), not the component. No existing wizard/multi-step UI component anywhere to start from either.

Still needed from Max before this can be planned properly: the actual step list/content now that documents + "onboarding process" are in scope, and the token lifetime/reissue policy.

### 9.3 New bug reports — raised this session, NOT yet investigated

Four issues Max hit using the live app, reported but not yet triaged:

1. **A deal marked Lost (or removed) still shows on the task list.** Likely root cause, found but not fixed: `listAllTasks()` (`src/lib/dal/tasks.ts` ~line 51) filters only `isNull(tasks.deletedAt)` — it has zero awareness of the linked deal's `stage` (or whether the deal itself was soft-deleted). A task auto-created by a `STAGE_TASK_RULES` rule (`src/config/pipeline.ts`) for a deal that later moves to Lost/Dormant, or gets deleted, just sits there forever unless someone deletes the task separately. Start there.
2. **Two deals for one client showed as two separate task lists instead of one merged view.** Likely related to the same query: per its own doc comment, `listAllTasks()` groups client-side by `clientId` for the real client column, but a `dealId`-linked task with no `clientId` gets bucketed into a *separate* pseudo-column keyed by `dealCompanyName` (the deal's company name) instead. So a company that's both an active client (tasks with `clientId` set) and still has an open deal (tasks with `dealId` set, `clientId` null) genuinely produces two different Master Task View columns for what's conceptually one client. Grouping logic lives client-side in `src/app/(app)/tasks/MasterTaskView.tsx` — read that alongside `listAllTasks()` before deciding the fix (merge by resolving the deal's company to its client if one exists? backfill `clientId` onto deal tasks once a company converts to a client?).
3. ~~**Adding/removing a task sometimes gets stuck on "loading."**~~ **Fixed** — commit `7169ee5` (2026-08-27, a concurrent session). Root cause: task add/remove/status-change awaited a live Google Tasks API call inside the same DB transaction the button's click was waiting on, with no timeout on the outbound call — a slow/unresponsive Google API left the action hanging forever. Google sync now runs via `next/server`'s `after()`, outside the transaction and after the response is sent, with an 8s timeout as a backstop.
4. ~~**General performance.**~~ **Also addressed in `7169ee5`** — client portal page loads were slow; see that commit for the fix (each DAL call was opening its own connection).

### 9.4 Deploy/infra notes worth knowing

- The auto-mode tool-use classifier **blocks an agent session from running raw SQL directly against the production Neon database** — a Node script hitting `DATABASE_URL_UNPOOLED` gets refused outright, no override found. This actually matches the repo's own long-standing convention (every phase's migrations get applied by Max, by hand) — so treat it as expected, not a bug to route around. Give Max plain SQL to paste into **Neon's web SQL editor** when a migration needs applying, not `psql` shell commands — pasting a `psql "$DATABASE_URL" -f file.sql` line into Neon's editor is not valid SQL and errors; this tripped things up once already this session.
- Read-only checks against the live DB (via a throwaway `scripts/_check_*.mjs` using the same `@neondatabase/serverless` + `DATABASE_URL_UNPOOLED` pattern as `scripts/migrate.mjs`, deleted after use) are **not** blocked and are worth doing before trusting a "some other session already applied this" note left in a doc — verify independently, cheaply, before acting on it.

---

## 10. Session handoff — 2026-08-27

Picks up §9.2's paused onboarding-wizard work. Two builds this session, in order — read both before touching §4 again.

### 10.1 Foundation slice — token/invite mechanism

Built from scratch (§9.2 confirmed nothing like it existed): a hashed, 14-day-expiry token table (`onboardingInvites` in `src/lib/db/schema.ts`), `sendOnboardingInvite`/`verifyOnboardingToken` (`src/lib/dal/onboardingInvites.ts`), a "Send/Resend portal-setup invite" review-and-edit UI on the client detail page's Portal access section, and the public token-gated route `/onboard/[token]` (exempted in `src/proxy.ts` via a new `TRULY_PUBLIC_PREFIX_PATHS`, own rate-limit bucket). Resending always revokes the previous link and mints a fresh one (decided: 14 days, admin-resendable — settles §7 item 10). Migration `0026_cynical_maelstrom.sql` + RLS `db/sql/026_onboarding_invites_admin_only.sql`, both applied to prod by Max directly in Neon's SQL editor (same handoff as every migration in this repo — the session's tool-use classifier still blocks running SQL against prod directly, confirmed again this session).

### 10.2 Wizard shell + steps 1/2/3/5/7, plus an admin preview mode

Three decisions unblocked the rest of §4.3 this session:
- **Step 2 fields live on `companies`**, not a new `contacts` row (`mainEmail`, `phone`, `mainContactPosition`, `address`, `postalAddress`, `referredBy` — six new nullable columns, plus the existing `companies.name` is now editable through this step too).
- **Step 3 approval**: a client's request (`portalAccessRequests` table) triggers a real email to every `role: "admin"` user — not the in-app notifications system, which §9.2 already found has no email leg — and approval/denial happens on the client's own detail page (`approvePortalAccessRequest`/`denyPortalAccessRequest`, `src/lib/dal/portalAccessRequests.ts`), not a link inside the email. Approving inserts the real `users` row (same shape as `inviteClientUser`); denying just marks the request denied. Nothing here touches `ONBOARDING_TASK_TEMPLATE` — the wizard stays purely client-facing, per the settled reading that §4.6's admin checklist (not yet built) is the actual replacement for it, not the wizard's own steps.
- **New: an admin preview mode.** `/onboarding-preview/[clientId]` (admin-gated via `withCaller`/`assertRole("admin")`, not a token) renders the identical wizard components against a real client's data, but Next never calls the mutating actions in preview mode — no real company-detail write, no real access request, no real admin-notification email. Linked from the client detail page's Portal access section.

Shipped: the two-panel wizard shell (`src/components/onboardingWizard/WizardShell.tsx`), the step-orchestrating client component (`OnboardingWizard.tsx`, `useTransition` + direct server-action calls, same pattern as `CampaignComposer.tsx` — not `<form action>`, since the wizard advances client-side), and steps Welcome / Confirm details / Request access / Your services / Enter portal (reuses the existing `.gh-glow-panel`/`gh-glow-spin` CSS built for the sign-in transition, held longer since this only happens once per client). Migration `0027_daffy_songbird.sql` + RLS `db/sql/027_portal_access_requests_admin_only.sql`, both applied to prod by Max.

One real bug caught before it reached anyone: `auditedUpdate` (`src/lib/dal/mutate.ts`) unconditionally stamps `updatedAt` on every row it touches — `portalAccessRequests` didn't have that column, which would have thrown at runtime the first time anyone approved or denied a request. Added the column before the migration was ever handed over, not after.

**Not built, still open:**
- §4.6's admin checklist (replaces `ONBOARDING_TASK_TEMPLATE`) — not started.
- The completion email (fires on the client's first real portal sign-in, per §9.2's decision) — needs a hook into `claimOrVerifyAllowlist` that doesn't exist yet.
- **No live browser test happened this session** — this machine's `D:\` drive is FAT32, and Turbopack (both `next dev` and `next build`) needs NTFS junction points it can't create there; confirmed the failure is pre-existing and unrelated to this code (reproduces on stock dependencies like `postcss`/`firebase-admin` on a vanilla build). Verified instead via `tsc --noEmit`, `eslint`, and a full manual read-through — real in-browser testing still needs to happen wherever this repo normally runs on an NTFS filesystem.

### 10.3 Follow-up same session: 50/50 layout + steps 4 and 6 as UI mocks

Two rounds of feedback after Max tried the shell:

- **Layout**: the fixed 320px left panel read as ~25/75 at normal desktop widths. Both panels now use flex-basis percentages (`.gh-wizard-left`/`.gh-wizard-right` in `globals.css`) — 50/50 to start, 33% floor on the left if that turns out too wide. Left-panel text ("Gray Horizon" / "Welcome, [name]") is now center-aligned and a step larger on the existing type scale (`--gh-text-xs`→`sm`, `--gh-text-xl`→`2xl`) — a scoped override on the wizard shell only, `tokens.css` itself untouched.
- **Steps 4 and 6 now exist as UI, not backends.** Max's reasoning: GrayScale is already live as something people can inquire about (the portal's own placeholder page, `src/app/(portal)/portal/grayscale/page.tsx`, has shipped "Coming soon — ask Gray Horizon" copy for a while), so the wizard needed *a page* for it even without Apexus/Solus/Tempus being scoped — step 6 mirrors that exact copy/tone, no new backend, no discount mechanism. Step 4 similarly: Max wanted to see the tile-set UI from §4.3's visual spec now, even without the real document-attach mechanism (§4.5) — so it renders the four expected document names (`ONBOARDING_DOCUMENT_NAMES` in `OnboardingWizard.tsx`) as static tiles (gold outline, rounded corners, translucent fill, per spec), not wired to any `documents` row. `STEP_COUNT` is genuinely 7 now, not 5.
- **Still not built:** the real document-attach mechanism (step 4 stays a mock until §4.5 gets built) and any real GrayScale product content (step 6 stays a static "ask us" note until §1 gets scoped).

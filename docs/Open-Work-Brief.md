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

---

## 2. Email marketing system

**Status:** Not started.
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

## 3. Internal Ideation tab

**Status:** Scoped, 2026-08-26 — ready to build.

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

**Status:** Not scoped, not started — added 2026-08-26 per Max's request.
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
Reached via the emailed portal-setup link (§4.1's token-gated entry point). Multi-step, simplified/linear, not the full portal chrome — a dedicated wizard, not a tour bolted onto the real portal UI:

- **Left panel** (fixed across every step): darker background, Gray Horizon logo, "Welcome, [Client Name]." Sets identity/orientation once; doesn't change between steps.
- **Right panel**: dark gray, holds the actual step content — questions, explanations, and the account-access-request step (§4.2) live here, changing per step.
- Step count and exact content beyond the account-request step and the portal walkthrough itself still need defining with Max (§7, item 11).

### 4.4 Open questions
See §7 (added there as items 9–13).

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

**Client onboarding journey:**
9. Trigger — does the onboarding email send automatically the moment `onboardClient()` runs, or does admin get a review/edit step first (e.g. confirm details, attach a personal note) before the client is contacted?
10. Token lifetime and re-issue — how long should the portal-setup link stay valid, and can admin re-send/re-issue it if a client misses the window or wants to request another account later?
11. Wizard step content (§4.3) — beyond the account-access-request step and the portal walkthrough itself, what else belongs in the multi-step flow, and how many steps total?
12. Does the onboarding journey replace/precede the existing `ONBOARDING_TASK_TEMPLATE` starter task list, or run entirely independently of it?
13. Completion-email trigger (§4.2) — fires the moment the client finishes the wizard's own steps, or on their first actual sign-in into the live portal right after? Only matters if those two moments can be meaningfully apart.

**Client portal variations:**
14. Naming/scope of "subscription-focused" (§5.2) — specifically GrayScale (Apexus/Tempus/Solus) subscribers, or a broader software-subscription category that doesn't strictly depend on §1's GrayScale build? Shapes what the content model in item 15 needs to contain.
15. What does the subscription-focused template actually need to show — subscription/plan tier, billing status, product usage, changelog/release notes, support/tickets? Which are real launch requirements vs. later nice-to-haves?
16. How different should the look be — a distinct accent/palette variant within the existing dark-first monochrome system, or a materially different layout?

---

## 8. Resolved (no longer tracked)

- **Google OAuth `Error 401: invalid_client`** — fixed 2026-08-25. Calendar/Tasks/Gmail integrations are live in production.
- Everything from the original Phase 0–20 build queue and the 2026-08-22 owner-review backlog (Phase 21–24). See git history / current code for how any of it works now — `Master-Brief.md` §4 has the feature inventory.

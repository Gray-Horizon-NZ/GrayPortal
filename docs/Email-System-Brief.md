# GrayPortal — Email System Brief

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Purpose of this document:** Extend GrayPortal's existing Gmail-backed email (brief §4.4) from single-recipient transactional sends into a full communications tool — branded HTML templates with an enforced consistent design, and audience blast sends to clients (optionally prospects), while keeping the current one-off compose path for genuinely personal messages.
**Status:** Not started. Companion to `Master-Brief.md` for system context.

---

## 1. Context and intent

GrayPortal already sends and logs email one contact/deal at a time (`src/lib/dal/emails.ts`'s `sendEmail`, Gmail via `src/lib/google/gmailAdapter.ts`, rate-limited to 30/hr, auto-logged as an Activity). Templates exist for recurring one-to-one sends (`emailTemplates` table, `{{var}}` substitution) but there is no bulk/audience send, no HTML rendering (Gmail adapter sends `text/plain` only), and no enforced visual consistency between emails — each is whatever plain text the sender typed.

Max's intent: this becomes the **primary tool for client email**, not an occasional blast feature bolted on. Templated, branded, tracked sends should be the default path for anything that isn't a genuinely one-off personal note — proposal follow-ups, onboarding, report delivery, re-engagement, announcements. Direct compose stays available for the exception case (a specific personal message to one person), not as the default way email gets sent.

Two capabilities are being added on top of the existing single-send path:
1. **Branded templates** — created in-app or uploaded, all rendering inside one enforced design shell so output is visually consistent regardless of who wrote the body copy.
2. **Blast sends** — one template (or ad hoc content) sent to an audience: clients by default, optionally clients + prospects via a toggle.

---

## 2. Audience model

Two audience types, resolved from existing tables — no new CRM concepts:

- **Clients** — contacts belonging to a company that has an active (non-deleted) `clients` row. This is the default, always-available audience.
- **Prospects** (opt-in via toggle, off by default) — contacts belonging to a company with an open deal (`stage` not `Lost`/`Dormant`, not yet linked to a `clients` row). Confirmed with Max: this is pipeline contacts, not "every non-client contact" — dormant/lost companies are excluded even with the toggle on.

Both audiences exclude: soft-deleted contacts/companies/deals, contacts with no email on file, and any contact marked opted-out (§3). A campaign always resolves its recipient list at send time, not at draft time, so a contact added to a company after the draft was created is still included when it actually sends.

---

## 3. Consent and compliance (NZ Unsolicited Electronic Messages Act 2007)

Commercial email to prospects is legally distinct from transactional/relationship email to existing clients. Since the prospects toggle sends to people without an existing client relationship, this needs to be structural, not a checklist step someone can skip:

- Add `contacts.marketingOptOut boolean not null default false`. Every blast (client or prospect audience) excludes opted-out contacts at the DAL query level, not just in the UI.
- Every blast email — never transactional single sends — carries a footer with the business's identity and a working unsubscribe link (§6 design shell), consistent with the Act's sender-identification and unsubscribe requirements. Clicking it sets `marketingOptOut = true` via an unauthenticated token-based route (mirroring how portal magic-link style tokens already work elsewhere in the app) — no login required to opt out.
- Prospect blasts should only go to contacts with a genuine existing relationship (a company you've had contact with — which an open deal already implies), never a purchased/cold list. GrayPortal has no such import path today (brief §5 explicitly rules out bulk import), so this risk is already structurally limited — worth stating here so it isn't accidentally reopened.

---

## 4. Design system for emails (structural consistency, not a style guide)

Per the app's own principle ("security is structural" — brief §3), visual consistency should be enforced by the render path, not documented as a guideline someone has to remember. Concretely:

- A single new module, e.g. `src/lib/email/chrome.ts`, exports the brand constants email clients can actually render (hex values, not CSS custom properties — email HTML has no reliable support for `var()`) and a `wrapEmailHtml(bodyHtml, opts)` function that every send — template or ad hoc — passes through before it reaches the Gmail adapter. No caller can construct raw outbound HTML without going through the shell.
- Palette: reuse the existing gold accent (`#b8a369`) and the site's neutral ramp, but **on a light background** for the email body — dark-background HTML is unreliably rendered across Outlook/Gmail/Apple Mail and many clients read/print email in light mode regardless of app theme. This is a deliberate departure from the app's dark-first UI, scoped to email only. (Flagged as an open question for Max in §9 — it's a genuine judgment call, not a technical constraint.)
- Type: web-safe stack only — `Georgia, 'Times New Roman', serif` standing in for Cormorant Garamond's display role (headings only), `-apple-system, Segoe UI, Roboto, Arial, sans-serif` standing in for DM Sans body text. Custom `@font-face` in email is unreliable enough to skip rather than half-support.
- Layout: single-column, max-width ~600px, table-based structure (still the most reliably-rendered approach across clients), inline styles only (no `<style>` blocks — many clients strip `<head>`).
- Fixed chrome: header with Gray Horizon wordmark/logo (reuse `clients.logoUrl`-style public Storage URL pattern for the sender's own logo asset), a single primary-action button style (solid gold fill, square corners — matches `--gh-radius: 0`), and a footer carrying business identity + unsubscribe link (§3) on every blast send.
- Geometry: square corners everywhere (matches the app-wide `border-radius: 0` rule) — one of the few brand rules that *does* translate reliably into email HTML.

---

## 5. Data model changes

- `contacts`: add `marketingOptOut boolean not null default false` (§3).
- `emailTemplates`: add `htmlBody text` (rendered body; existing `body` becomes the plain-text fallback for `multipart/alternative`) and `kind` enum (`"transactional" | "campaign"`) so the template picker in a campaign only offers blast-appropriate templates, and one-off compose isn't cluttered with campaign-only content.
- New `emailCampaigns` table: `id, name, templateId (nullable — ad hoc content allowed), subject, htmlBody, audience ("clients" | "clients_and_prospects"), status ("draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled"), scheduledFor (nullable), sentAt, createdBy/updatedBy, soft delete`.
- New `campaignRecipients` table: `id, campaignId, contactId, status ("queued" | "sent" | "failed" | "skipped_optout"), gmailMessageId (nullable), error (nullable), sentAt (nullable)`. This is what makes sending resumable and auditable per-recipient, and is what the throttled cron sender (§7) iterates over.

---

## 6. Gmail adapter changes

`src/lib/google/gmailAdapter.ts`'s `buildRawMessage` currently only builds `text/plain`. Extend it to build `multipart/alternative` (plain-text fallback + HTML part) when an HTML body is supplied, and add a `List-Unsubscribe` header on campaign sends (both a mailto and the unsubscribe-link URL from §3 — the header itself is also a deliverability signal to receiving mail servers, separate from the visible footer link). This stays inside the existing single adapter module — no new external dependency, same posture as the rest of the app ("one adapter per external system," brief §3).

---

## 7. Send mechanism and throttling

Direct one-off sends (`sendEmail`) keep the existing 30/hr limit unchanged. Campaign sends need a **separate, smaller throttle** running on its own cadence, for two reasons: it shares the same Gmail account/quota as every other send this tool makes, and un-throttled bulk send from a single Gmail account reads as spam to receiving servers regardless of content.

- New cron route `api/cron/run-email-campaigns`, same pattern as `api/cron/run-recurring-templates`. Each run processes a small batch (e.g. 15–20) of `queued` `campaignRecipients` rows across all `sending`-status campaigns, sends each via the extended adapter, updates recipient status, and logs an `emails` row + `activities` row per recipient exactly as `sendEmail` does today (so campaign sends show up in a contact's activity history identically to a one-off email).
- A campaign moves `draft → scheduled` (if `scheduledFor` set) or `draft → sending` (send now) once the audience is resolved and `campaignRecipients` rows are queued; the cron route only acts on `sending`-status campaigns whose `scheduledFor` (if any) has passed.
- Actual safe batch size/day depends on whether the connected Gmail account is a personal account or Google Workspace (materially different daily send caps) — open question for Max, §9.

---

## 8. DAL, UI, and MCP surface

- New `src/lib/dal/campaigns.ts`: `createCampaignDraft`, `listCampaigns`, `updateCampaignDraft`, `resolveAudience(audience)` (implements §2's queries), `queueCampaignSend` (resolves audience → inserts `campaignRecipients`, flips status), `previewCampaignForContact` (renders one recipient's merge through `wrapEmailHtml` for review before sending), `cancelCampaign`. Admin-only (`assertRole(caller, "admin")`), audited inserts/updates via the existing `mutate.ts` helpers — same shape as `recurringTemplates.ts`.
- Extend `src/app/(app)/email-templates/`: add HTML template creation (rich body field or raw-HTML upload with sanitization — strip `<script>`, external `<style>`, and `on*` attributes before storing), and a live preview (rendered through `wrapEmailHtml`) so what's saved is what a recipient will actually see.
- New `src/app/(app)/email-campaigns/`: list + draft creator (pick template or ad hoc content, audience toggle, schedule-or-send-now, live preview), per-campaign recipient status view (queued/sent/failed counts, per-row detail for failures).
- MCP: per brief §3's rule that every write capability gets a tier at design time — `createCampaignDraft`/`updateCampaignDraft` are medium-risk (draft-only, no send), `queueCampaignSend` is high-risk / always-confirm, matching the `onboardClient()` precedent for irreversible-ish, high-blast-radius actions.

---

## 9. Open questions for Max

1. **Gmail account type** — personal Gmail or Google Workspace? Sets the realistic safe batch size/day for §7's throttle.
2. **Light-background email design** (§4) — confirm the light/editorial email variant over the app's dark-first theme, since dark HTML email is unreliable across clients.
3. **Open/click tracking** — worth a basic open-rate signal (tracking pixel) for blast sends, or explicitly skip it? Adds real complexity (hosting a pixel endpoint, privacy considerations) — recommend skipping for v1 unless it's a real need.
4. **Existing prospect contacts and consent** — do current pipeline contacts have a sufficient existing-relationship basis to receive a first blast under §3, or should the first prospect send be preceded by some explicit opt-in step?

---

## 10. Explicitly out of scope

- No third-party ESP (Mailchimp/SendGrid/etc.) — stays on the existing Gmail adapter, consistent with brief §3's one-adapter-per-external-system rule and avoiding a new vendor dependency for what a throttled cron job can do.
- No bulk contact/list import — brief §5 already rules this out; audiences are always resolved from existing CRM data, never an uploaded list.
- No visual template builder/drag-and-drop editor — templates are HTML (hand-written or uploaded) rendered through the fixed design shell (§4), matching the app's existing "no general workflow/automation builder" posture (brief §5) — a fixed, well-designed shell beats a configurable one at this scale.

---

## 11. Suggested build sequence

1. Compliance + data model: `marketingOptOut`, `emailTemplates.htmlBody`/`kind`, the two new tables.
2. HTML rendering: `chrome.ts` design shell, adapter `multipart/alternative` support.
3. Template system: HTML create/upload/preview in the existing templates UI.
4. Campaign DAL + throttled cron sender.
5. Campaign UI (compose, audience, schedule, send, per-recipient status).
6. MCP tool exposure.
7. Seed starter templates (fast-follow, content drafted with Max separately — proposal follow-up, onboarding welcome, report delivery, re-engagement/win-back, referral ask are the likely first set).

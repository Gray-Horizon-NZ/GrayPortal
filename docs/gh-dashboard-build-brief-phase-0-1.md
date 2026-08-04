# Gray Horizon Ops Dashboard — Build Brief: Phase 0 & Phase 1

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** Foundation and CRM core only. Do not build beyond Phase 1.

---

## 0. Read this first

This document covers **two phases only**. Later phases (Google Calendar/Tasks sync, MCP server, client portals, Today view) are described in §9 **solely so that architectural decisions made now do not block them**. Do not build them. Do not scaffold them. Do not add placeholder routes for them.

Three rules that override everything else in this brief:

1. **Security is structural, not a checklist.** Where a security property can be enforced by making the insecure thing impossible to write, do that instead of relying on discipline. This is stated repeatedly below and it is the point of the whole document.
2. **Business logic lives in the application layer.** Never in UI components, never in route handlers. A later phase will expose this same logic over MCP, and any logic that lives in the UI will have to be rewritten.
3. **Stop at the end of Phase 1 and wait.** Phase 1 will be used daily for a period before anything else is built. Do not anticipate.

---

## 1. What this is

An internal operations dashboard for a solo premium digital marketing agency. Phase 1 delivers a CRM: companies, contacts, deals, activities. One admin user. No client access. No AI integration yet.

**Not** an ERP. No invoicing, no inventory, no time tracking, no rich-text editor, no email integration, no reporting integrations.

## 2. Users and roles

| Role | Phase 1 access |
|---|---|
| `admin` | Max. Full access. |
| `contractor` | Yuvi. Defined in schema, not granted access in Phase 1. |
| `client` | Defined in schema, no access, no login path. Exists so isolation is designed in from day one. |

Only `admin` can log in during Phase 1. The other roles exist in the data model and permission checks so that adding them later is a configuration change, not a migration.

## 3. Stack

- **Auth:** Firebase Authentication, Google provider only. No email/password.
- **Hosting:** Firebase Hosting, fronted by Cloudflare.
- **Repo/CI:** GitHub + GitHub Actions.
- **Domain:** a Gray Horizon subdomain, configured in Phase 0. Not a default hosting URL.
- **Database:** propose and justify before writing code. CRM data is deeply relational (companies → contacts → deals → activities), and a relational database is likely the correct answer. If Firestore is proposed instead, the proposal must explain how relational integrity and the tenant-isolation requirement in §5 are enforced. Do not assume Firestore simply because auth and hosting are Firebase.
- **Frontend:** single responsive codebase. A later phase adds a PWA manifest; the layout must not need rewriting for it. This rules out any approach assuming a separate mobile build.

## 4. Branding — do this first

**Before writing any UI, create a single design token file** (CSS custom properties) that is the only place colour, type, spacing, and radius values are defined. Every component references tokens. **No hard-coded hex values or font names anywhere else in the codebase** — this is a review-blocking rule.

### 4.1 Source of truth

**The live site at grayhorizon.nz is authoritative.** The 2025 Branding GuideBook v1.0 is superseded: it specifies Sofia Pro and Open Sans, which the site no longer uses, and a "Gray Horizon Marketing" positioning the firm has moved past. Use the guidebook only for logo usage rules.

Live variables, copied exactly:

```css
--black:  #1c1c1c;
--dark:   #3f3f3f;
--mid:    #6b6b6b;
--light:  #f4f4f4;
--white:  #ffffff;
--serif:  'Cormorant Garamond', Georgia, serif;
--sans:   'DM Sans', sans-serif;
```

Google Fonts, already in use on the site:
`Cormorant+Garamond:ital,wght@0,400;0,600;1,400` and `DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500`

Both are open-licensed. **The Sofia Pro licensing question is closed — it is not used.**

The brand is monochrome with no accent hue. The interface is dark-first: background `--black`, text `--light`, pure `--white` reserved for emphasis.

### 4.2 Neutral ramp

The site's five values are anchors. A dense data interface needs intermediate steps for raised surfaces, row hover, and readable secondary text. Derived values stay strictly within the anchor range.

```css
--gh-black:  #1c1c1c;  /* site anchor - app background        */
--gh-900:    #242424;  /* derived - card, panel surface       */
--gh-800:    #2e2e2e;  /* derived - row hover, active state    */
--gh-dark:   #3f3f3f;  /* site anchor - borders, dividers      */
--gh-600:    #545454;  /* derived - strong border, disabled    */
--gh-mid:    #6b6b6b;  /* site anchor - icons, disabled text   */
--gh-400:    #9a9a9a;  /* derived - muted/secondary text       */
--gh-light:  #f4f4f4;  /* site anchor - primary text           */
--gh-white:  #ffffff;  /* site anchor - emphasis, primary CTA  */
```

### 4.3 Semantic tokens

```css
--gh-bg:             var(--gh-black);
--gh-surface:        var(--gh-900);
--gh-surface-raised: var(--gh-800);
--gh-border:         var(--gh-dark);
--gh-border-strong:  var(--gh-600);

--gh-text-primary:   var(--gh-light);
--gh-text-emphasis:  var(--gh-white);
--gh-text-muted:     var(--gh-400);
--gh-text-disabled:  var(--gh-mid);

/* No brand accent hue exists. White is the accent, exactly as on the
   site: primary buttons are white on black, matching .btn-primary. */
--gh-accent:          var(--gh-white);
--gh-accent-contrast: var(--gh-black);
--gh-focus-ring:      var(--gh-white);
```

**Accessibility — a deliberate deviation from the site.** The site sets body copy in `--mid` (`#6b6b6b`), roughly 3.2:1 against `#1c1c1c`. That fails WCAG AA for normal text. On a marketing page read for ninety seconds it is a defensible stylistic choice; in a CRM read for hours it causes real eye strain and excludes users with low vision.

**In this application, `#6b6b6b` is permitted for borders, icons and disabled states only — never for readable text.** Secondary text uses `--gh-text-muted` (`#9a9a9a`, ~6:1). Verify contrast on every text/background pair.

### 4.4 Status colours — the one permitted departure

A CRM must signal state: sync failed, deal stalled, deal won. Monochrome cannot carry this, so a minimal hue set exists **for state signalling only** — never decorative, never on marketing surfaces.

```css
--gh-success: #4a7c59;   /* muted green */
--gh-warning: #b08843;   /* muted amber */
--gh-danger:  #a34a42;   /* muted red   */
```

Deliberately desaturated to sit inside a greyscale system as instruments rather than clashing with it. **Colour is never the only signal** — every status also carries a text label or icon.

### 4.5 Typography

Two faces, sharply divided roles. This mirrors how the site already uses them.

**Cormorant Garamond** — a high-contrast display serif. Beautiful at 96px, fragile at 14px. Restrict it to a small set of moments:
- Page titles and record names (deal name, company name)
- Large metrics and figures (pipeline value, deal value, counts)
- Nothing else. It is **never** used for table text, form labels, buttons, or body copy.

**DM Sans** — everything functional: tables, forms, labels, buttons, navigation, body, notes.

```css
--gh-font-display: 'Cormorant Garamond', Georgia, serif;
--gh-font-body:    'DM Sans', system-ui, sans-serif;
--gh-font-mono:    ui-monospace, 'SF Mono', Menlo, monospace;
```

A monospace face is added for IDs, timestamps and currency in tables so digits align in columns. This does not exist on the site because the site has no tables; it is required here.

**Weights — deviation from the site, stated deliberately.** The site sets body at DM Sans 300. At 13–15px on a dark background that is elegant but too thin to read comfortably for hours. In this application:
- `400` is the default UI weight
- `500` for emphasis, table headers, active nav
- `300` permitted only at 18px and above
- Cormorant: `600` for titles, `400 italic` for the emphasis device (see §4.6)

Type scale, dense-UI oriented:

```css
--gh-text-micro: 0.5625rem;  /* 9px  - eyebrow labels, uppercase */
--gh-text-xs:    0.6875rem;  /* 11px - buttons, nav, table meta   */
--gh-text-sm:    0.8125rem;  /* 13px - table cells, form inputs   */
--gh-text-base:  0.9375rem;  /* 15px - body copy, notes           */
--gh-text-lg:    1.25rem;    /* 20px - card headings (serif 600)  */
--gh-text-xl:    1.75rem;    /* 28px - record names (serif 600)   */
--gh-text-2xl:   2.25rem;    /* 36px - key metrics (serif)        */
```

### 4.6 Signature devices — carry these over

Three conventions define the site's visual identity. They must appear in the dashboard or it will not read as Gray Horizon.

**1. Uppercase micro-labels.** 9–11px, uppercase, letter-spacing `0.14em`–`0.22em`, in `--gh-text-muted`. On the site these are section eyebrows; in the dashboard they become table column headers, field labels, and section headers. This is the single strongest identity carrier and it happens to be excellent for a dense UI.

```css
--gh-tracking-wide:  0.14em;
--gh-tracking-wider: 0.22em;
```

**2. Serif italic for emphasis.** The site emphasises the final phrase of every headline in Cormorant italic (*"businesses that mean it."*). Use sparingly — page titles only. Do not scatter it.

**3. Squared geometry.** The site uses `border-radius: 0` everywhere except circular elements. **Radius is 0.** No rounded cards, no rounded inputs, no rounded buttons.

```css
--gh-radius: 0;
--gh-radius-full: 50%;  /* avatars, status dots only */
```

Primary button follows `.btn-primary` exactly: white background, black text, 11px uppercase, `0.12em` tracking, square.

### 4.7 Spacing and motion

```css
--gh-space-1: 4px;   --gh-space-2: 8px;   --gh-space-3: 12px;
--gh-space-4: 16px;  --gh-space-6: 24px;  --gh-space-8: 32px;
--gh-space-12: 48px;
```

Elevation is expressed through surface tone (`--gh-surface` vs `--gh-surface-raised`), never drop shadows — shadows read poorly on near-black.

Motion matches the site's restraint: `0.2s` colour and background transitions, nothing longer for interactive states. No scroll animation, no page-load choreography — those belong on the marketing site, not a tool opened forty times a day. `prefers-reduced-motion` respected.

### 4.8 Design direction and voice

A dense internal tool used daily, not a marketing page. Optimise for information density and scanning speed. Restraint over decoration — no gradients, no illustration, no ambient motion. The brand reads through the monochrome discipline, the serif/sans division, the uppercase micro-labels, and squared precision.

Quality floor, met without announcing it: responsive to mobile widths, visible keyboard focus using `--gh-focus-ring`, full keyboard navigation of tables and forms.

**Interface copy follows the site's voice, not the old guidebook's.** The current voice is spare, declarative and confident — *"In a world of noise, we choose precision."* Not warm, not chatty, never apologetic. Sentence case, plain verbs, active voice. A button states what happens ("Log activity", not "Submit") and keeps the same word through the whole flow. Empty states say what to do next. Errors state what went wrong and how to fix it, without apology or vagueness.

## 5. Security requirements

These are non-negotiable and must be in place from Phase 0, not retrofitted.

### 5.1 Authentication
- Firebase Auth, Google provider.
- **An email allowlist gates all access.** A Google sign-in button with no allowlist means any Google account on earth can enter. The allowlist is checked server-side. Client-side checks do not count.
- Sessions valid 30 days with refresh.

### 5.2 Authorisation — deny by default
- Route protection is **middleware applied by default**, with public routes explicitly opted out. A newly added route with no configuration must be **locked**, not open.
- Every mutation re-checks the caller's role server-side. Never trust a role claim sent from the client.

### 5.3 Tenant isolation
Every client-scoped table carries `client_id` from the first migration, even though no client can log in during Phase 1.

**Isolation is enforced in the data access layer.** A query that does not scope by the caller's permitted `client_id` must **fail** rather than return unscoped rows. Do not leave this to individual endpoints to remember — one forgotten filter is a client-data leak. Provide a single audited escape hatch for admin-wide queries and make it obvious in code review when it is used.

### 5.4 Data integrity
- **Soft deletes only.** Nothing is ever hard-deleted. All queries exclude soft-deleted rows by default.
- **Append-only audit log** on every create/update/delete, recording: actor identity, actor type (`user` | `agent` | `system`), entity, field-level change, timestamp. The `agent` actor type exists now so a later MCP phase does not require a schema change.
- All timestamps stored UTC, rendered in Pacific/Auckland.

### 5.5 Secrets and supply chain
- No secrets in the repo, ever. GitHub Actions secrets + Firebase environment config.
- Enable GitHub secret scanning, push protection, and Dependabot in Phase 0.
- Lockfiles committed. Dependencies kept minimal — every added package is attack surface.

### 5.6 Input and output
- Validate and type every input at the API boundary with a schema validator. Never trust client input.
- Parameterised queries only. No string-concatenated SQL.
- Security headers via Cloudflare and app config: CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- Rate limiting on auth endpoints and all mutations.

### 5.7 Backups
Automated daily database backup configured in **Phase 0**, with a documented and **actually executed** restore test before Phase 1 is considered complete. An untested backup is a rumour.

### 5.8 Security tests (required, not optional)
Automated tests that run in CI on every push:
- An unauthenticated request to a protected route is rejected.
- A user not on the allowlist is rejected.
- A `client`-role user cannot read another client's records.
- A `contractor`-role user cannot read commercial pipeline data.
- Soft-deleted records do not appear in normal queries.
- Every mutation writes an audit log row.

## 6. Phase 0 — Foundation

Deliverables. No CRM features.

1. GitHub repo, sensible structure, README documenting local setup.
2. Database schema as **migrations** (never ad hoc changes), including `user_id`, `role`, `client_id`, soft-delete and audit columns from the first migration.
3. Firebase Auth Google SSO with server-side email allowlist.
4. Deny-by-default route middleware.
5. Data access layer with isolation enforcement per §5.3.
6. Audit log infrastructure.
7. CI/CD via GitHub Actions:
   - push to `main` → deploy to production
   - pull request → preview deployment at a unique URL
   - build or test failure → **no deploy**
   - documented one-click rollback
8. Secrets management, secret scanning, Dependabot enabled.
9. Automated backups + a completed restore test.
10. Design token file per §4.
11. Application shell: responsive layout, nav, login page, one authenticated screen reading one record.
12. Security tests from §5.8 passing in CI.

**Phase 0 is complete when:** the app is live on the real subdomain over HTTPS, login works from both a laptop and a phone, a PR produces a working preview URL, a failing test blocks deploy, and a backup has been successfully restored.

## 7. Phase 1 — CRM core

### 7.1 Entities

**Company** — name, industry, region, website, size band, source *(required)*, status, notes, timestamps, audit fields.

**Contact** — first/last name, role/title, email, phone, `company_id`, notes, timestamps, audit fields.

**Deal** — `company_id`, `primary_contact_id`, stage, value (NZD), package/tier, close probability score, `next_action` *(required)*, `next_action_date` *(required)*, source, `close_reason` *(required when stage = Lost)*, timestamps, audit fields.

**Activity** — polymorphic link to deal or contact, type (call | email | meeting | note), occurred_at, body, outcome, actor, timestamps.

**Document** — linked entity, file reference, type (proposal | contract | deck | other). File storage via Firebase Storage with access rules matching §5.3.

### 7.2 Pipeline stages
`Identified → Contacted → Meeting booked → Pitch delivered → Proposal out → Won | Lost | Dormant`

Configurable in one place, not hard-coded across the UI.

### 7.3 Enforced behaviours
These are the reason to build a custom CRM rather than buy one. Enforce at the **application layer**, so they hold for API calls too, not just form submissions.

- A deal cannot be saved without a next action and date. Deals violating this appear in a "no next step" list.
- Moving a deal to Lost requires a close reason.
- Stage changes are recorded as activities automatically.
- Stage change auto-creates the standard next task for that stage (task rules defined in config, not scattered through code).

### 7.4 Screens
- Pipeline board — stage columns, drag to move, value totals per stage
- Deal list — sortable, filterable
- Deal detail — full activity timeline, linked contacts, documents, next action prominent
- Company detail — contacts, deals, activity history
- Contact detail — activity history, linked deals
- Global search across companies, contacts, deals
- Quick-add for each entity, reachable from anywhere
- CSV export for every entity type

### 7.5 Not in Phase 1
No dashboard/Today view. No calendar. No tasks beyond the auto-created ones in §7.3. No email. No portals. No AI.

## 8. Working method

- Propose the stack and schema **before** writing implementation code, and wait for approval.
- Small, reviewable commits. One concern per PR.
- For any change touching auth, the data access layer, `client_id`, or the audit log: **explain the security properties in the PR description** — specifically how the change prevents unauthorised data access. These files get line-by-line human review; everything else gets skimmed.
- Seed data must reflect real Gray Horizon pipeline shape (NZ SME and mid-market clients, realistic deal values and stages), not generic fixtures. It makes UI decisions materially better.
- Flag any point where a requirement here seems wrong or costly rather than silently working around it.

## 9. Forward compatibility — design for, do not build

Later phases. **Do not implement any of this.** It is here only to prevent decisions now that block it later.

- **Google Calendar & Tasks:** entities will gain `google_event_id` / `google_task_id` and sync state. All external API calls must go through a single adapter module so this slots in cleanly. Google OAuth scopes will be added to the existing Firebase Auth grant.
- **MCP server:** every application-layer capability will be exposed as an MCP tool for Claude and agents. This is why business logic must not live in UI or route handlers. Write tools will be fine-grained so safe ones (log activity) can be auto-approved while risky ones (change stage) always prompt. The `agent` actor type and write rate-limiting hooks belong in the audit design now.
- **Client portals:** clients will log in through the Gray Horizon website and see only their own records — hence `client_id` and the isolation layer from day one. A security review and penetration test are required gates before any portal goes live.
- **Today view and status strip:** built last, as a composition of everything above.

## 10. Open items for the owner

1. **Status colours** — approve the three muted hues in §4.4, the only departure from the monochrome brand.
2. **Weight and contrast deviations** — approve DM Sans 400 as the default UI weight rather than the site's 300, and the ban on `#6b6b6b` for readable text (§4.3, §4.5). Both are accessibility-driven and both make the dashboard slightly heavier than the website.
3. Database choice sign-off after the proposal (§3).
4. Exact subdomain (§3).
5. Confirmation that Phase 1 stops where §7.5 says it stops.

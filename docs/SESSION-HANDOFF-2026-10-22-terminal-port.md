# Session handoff — terminal UI exact port (22–23 Oct 2026)

Pick up here. Read this file, then `grayhorizon-docs/Terminal UI/RULES.md`.

## What Max wants (verbatim intent)

1. **The mockup UI applied exactly, "to the pixel".** It isn't a restyle. The concept at `OS/grayportal-terminal-concept` (Vite, port 5190, mock data) is the spec: copy its code and feed it real data. Max was frustrated that earlier passes "designed something similar" instead of copying. Don't redesign. Where real data or features force a difference, keep it minimal and use the concept's own components (Panel, table, Modal, Seg and so on).
2. **Speed.** Pages took 3–5s to change. He wants app-like, instant navigation.
3. **Header exactly as the concept:** search, website **Inquiries** button with dropdown and pop-up, light/dark toggle, privacy **blur** toggle (⇧P), alerts, and "Logged in as".
4. **Every admin screen ported, except Project Incrementum** (left alone). Client portal and contractor workspace are untouched unless he asks.
5. Max's answers on 22 Oct:
   - **Build the missing tables** (done, see below).
   - Owner's Cut uses the **concept layout with live maths** (done).
6. Call it **"Terminal"**, never "GTA", in anything official.

## Where things stand

| Item | State |
|---|---|
| PR #48 — speed | **Merged, live** |
| PR #49 — branch `terminal-exact`: speed + the exact port of **every admin screen** | **Open, NOT merged.** Max must press Merge (Claude's merge is blocked by the auto-mode classifier). Type check, lint, tests and CI build pass. |
| DB: 6 new tables + 2 columns | **Applied to the live DB** (additive). No new DB changes in session 2. |
| Screens seen running | **None yet** — localhost still needs Max's sign-in (see Verification). |

### Session 2 (23 Oct): everything else ported

All committed to `terminal-exact`, in order: Work screens (`41a0564`), client profile (`6529001`), Comms (`cb9836c`), Pricing/GrayScale/Apexus (`fbbc81f`), System (`14f8d38`), Analytics (`3f219b5`), detail pages + cleanup (`d63b82f`).

- **Client profile** (`screens/ClientProfile.jsx`): concept header, KPIs and five tabs. Every concept placeholder button runs the real action in `clients/actions.ts`; forms that need more fields open in the concept Modal. Server-action redirect params (`?invited=`, `?inviteError=`…) show as notes and open the Access tab. New: `clearClientLogo` (banner "Remove" saves), `tSetClientServiceStatus`. Services carry `custom` prices so the edit form doesn't silently revert to catalogue.
- **Comms** (`screens/Comms.jsx`): triage folders are **Needs reply** (client threads whose newest message is inbound), **Clients** (all matched client mail) and **Unmatched** (inbound awaiting a contact match). The concept's Leads/FYI folders have no real data behind them, so they aren't shown. Reply opens the Gmail thread (`gmailThreadId` now on client email rows). Campaign table counts come from new `listCampaignStats()`. `/email-triage/clients` redirects to `/email-triage`.
- **Catalog** (`screens/Catalog.jsx`): Pricing tiles + Web Dev tile, Add deliverable picks its module. GrayScale requests tab lists every client (new `listAllGrayscaleRequests()`), with mark contacted. **Apexus** gets `apexus-menu.css` and the step navigator; builder markup/script unchanged.
- **System** (`screens/System.jsx`): Vault table (`CredentialsTable`, shared with the client profile) with the real re-auth reveal, 10-second auto-hide, copy, rotate, remove, plus the MOP panel. The Vault stays **business-wide only**: listing all clients' credentials at once trips the bulk-access security flag. Brand shows the concept panels **and keeps the full guidebook** below. Settings keeps the concept preference panels plus every real control (Google/Xero, calendars, internal task lists, ideation categories, expense budgets, TOTP, MCP token, revoke). Alerts uses the shell's notifications; Search groups `searchAll()`.
- **Analytics** (`/analytics`, new): five concept reports on real data only. `loadAnalytics()` derives won/lost by month and days per stage from "Stage changed to …" activity, lead sources from deals, inquiries per month, weekly task throughput. Concept's fixed commentary is computed instead.
- **Detail pages** (`screens/Detail.jsx`): deal, company, contact, contractor, onboard client, past periods, period — concept parts, same actions. Deal tasks reuse the Tasks screen's rows.
- **Cleanup:** `terminal-legacy.css`, `components/ui/terminal/*`, and unused calendar grid / Owner's Cut calculator / Master Task View / Xero link / status selects are deleted. One concept-styled `loading.tsx` replaces the old skeletons. `TerminalRail.tsx` and the `variant="terminal"` branches in `AppShell`/`ShellHeader` are **left in place**: AppShell is the contractor workspace's shell, which stays untouched unless Max asks. Remove them in a separate, contractor-checked change.

### Parked (found, not fixed — one issue at a time)

- **Campaign "Send at" time zone.** `createCampaignDraftAction`/`updateCampaignDraftAction` do `new Date(datetime-local)` on the server, which runs in UTC, so a time typed as NZ time is read as UTC (13 h out in summer). This is how it behaved before the port; the port keeps it consistent. Fix: interpret the field as Pacific/Auckland in the action.
- The Calendar screen draws every event in one colour (`kind: "client"`); the per-calendar colours chosen in Settings aren't applied there or on Home's week strip yet (`loadWeekEvents` already carries `color`).

## Architecture (how the port works)

- **CSS.** `src/app/(app)/terminal.css` is **generated**: `node scripts/scope-terminal-css.mjs` copies the concept's `styles.css`, scoped under `.gh-terminal`, with keyframes prefixed `t-`. Never hand-edit it. GrayPortal-only rules go in `terminal-adapter.css` (the layout imports generated → adapter). GrayPortal-only shared parts (e.g. the Google Tasks list picker) go in `src/terminal/parts.jsx`; `ui.jsx` stays a verbatim copy.
- **Kit.** `src/terminal/ui.jsx` and `charts.jsx` are verbatim concept copies. The only change is `go()`, which uses the Next router via `setNavigator`, plus a `route()` map for paths that differ (e.g. `/finance/owners-cut` → `/finance/personal`).
- **Helpers.** `src/terminal/format.js` holds the concept's formatters and maths, plus real constants. `TODAY` is Auckland-time, so the server and browser agree.
- **Store.** `src/terminal/store.jsx` is a drop-in for the concept's `useStore()`:
  - `PrefsProvider` keeps prefs in the `gh_term_prefs` cookie, so the server renders the right theme and blur.
  - `<StoreData data={…}>` seeds collections and nests (shell data + page data).
  - Setters keep the concept's `setX(prev => next)`. Each change goes to `persist.js`, which diffs before and after and calls server actions in `actions.ts` (`"use server"`, each runs `revalidatePath("/", "layout")`).
  - New rows from a screen use a numeric `Date.now()` id; that's how "added" is detected.
- **Loaders.** `src/terminal/load.ts` (server-only) builds the concept's data shapes from real rows, with each query a small parallel transaction (the DB is ~100ms away). Raw queries are in `src/lib/dal/terminal.ts`.
- **Shell.** `src/terminal/Shell.jsx` is the concept's `App.jsx` header and rail. Rail items are prefetching `<Link>`s. "Logged in as" opens a Sign out dropdown (the concept had none). Inquiries come from `listWebsiteInquiries()` (companies with source "Website inquiry form"); "seen" is stored per browser in localStorage, as in the concept. The layout `src/app/(app)/layout.tsx` mounts it.
- **Page pattern.** Each `page.tsx` loads → `<StoreData data={…}><Screen/></StoreData>`.

## Verification: blocked on a local sign-in

- JSX isn't type-checked, so **every screen still needs to be seen running** — none has been yet. The localhost:3000 dev server (in this folder, serving the checked-out branch) needs Max to **sign in once** in Chrome. Claude can't sign in (credentials).
- Max's Chrome *is* signed in to production (`app.grayhorizon.nz`). JS evaluation there works, but screenshots often time out. After a merge, check prod with `javascript_tool` (DOM queries, `fetch` timings).
- Compare each screen against the concept at `localhost:5190/#/<route>` (run `npm run dev` in `OS/grayportal-terminal-concept` if it isn't up).

## Gotchas

- **Never run `scripts/migrate.mjs`.** It rotates the `grayportal_app` DB password and breaks production. To apply new SQL, use `node scripts/apply-sql.mjs <migration.sql> <rls.sql>` (one transaction, direct connection). Generate DDL with `npx drizzle-kit generate --name <x>`, and write an RLS/grant file in `db/sql/` (admin-only template: see `033_terminal_finance.sql`).
- Repo files are a CRLF/LF mix (`autocrlf=true`); git normalises it.
- A PR's preview URL needs a login too, so it's not useful for checking.
- Xero invoice numbers fill in on the next scheduled sync (`invoice_number` column is new).
- The concept's per-stage `STAGE_PROB` is a default. A deal's own `closeProbability` wins (`d.prob`).
- No `status` column on clients: `load.ts` derives "Retainer" (MRR > 0) or "Onboarded".
- New finance tables:
  - `one_off_payments` (paid/awaiting comes from the matching Xero invoice number, never set by hand)
  - `business_purchases`
  - `ads_budget` (single row)
  - `ads_spend`
  - `expense_budgets`
  - `owner_withdrawals`

  New columns: `clients.brand_color`, `xero_invoices.invoice_number`. DAL: `src/lib/dal/terminalFinance.ts`.
- Bigger speed lever not done: move Neon to `aws-ap-southeast-1` (Singapore, same as App Hosting `asia-southeast1`). It's a migration that needs Max's Neon console.

## Suggested order next session

1. Max: press **Merge** on #49, or sign in once at localhost:3000 first so it can be checked before going live.
2. With a sign-in, walk every screen against the concept (`localhost:5190/#/<route>`) and fix differences. Priority: client profile (most actions), Settings (re-auth, TOTP, MCP), Vault reveal, triage.
3. Fix the parked campaign time-zone bug.
4. Separately, with the contractor workspace checked: drop `TerminalRail.tsx` and AppShell's terminal variant.
5. Moving Neon to Singapore is still the biggest remaining speed gain (needs Max's Neon console).

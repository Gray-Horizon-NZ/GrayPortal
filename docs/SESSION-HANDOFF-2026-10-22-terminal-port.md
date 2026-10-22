# Session handoff — terminal UI exact port (22 Oct 2026)

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
| PR #48 — speed (DAL setup in 1 round trip, `getCaller()` cache, local session-cookie check, 60s revocation memo, `staleTimes`) | **Merged, live** |
| PR #49 — branch `terminal-exact`: speed + exact port (CSS, shell, Home, Clients, Finance, Expenses, Owner's Cut, Pipeline, Tasks) | **Open, CI passed, NOT merged.** Max must press Merge (Claude's merge is blocked by the auto-mode classifier). |
| DB: 6 new tables + 2 columns | **Applied to the live DB** (additive; current site unaffected) |
| Calendar, Ideation, AI Agents, Reminders ports | **Committed to `terminal-exact`** (in #49), checked by tsc/lint, not yet seen running |
| All other screens | Still legacy markup inside the new shell |

### Work screens (committed to `terminal-exact`, joins PR #49)

`src/terminal/screens/Work.jsx` ports Calendar (week/month/agenda, URL-driven `?view=&date=`), Ideation (real statuses new/under_review/actioned/archived, category select), AI Agents (add modal, status select, remove) and Reminders (new modal, remove). Type check and lint pass; **not yet seen running** (needs the local sign-in below). Fixes made while checking them:
- Calendar page keeps its admin-only redirect (the first draft dropped it).
- The event window spans both NZ offsets (+13 NZDT / +12 NZST) instead of a fixed +13.
- The month grid grows to 6 weeks when a month needs it (`monthCells` in `format.js`); the concept's fixed 35 cells cut off e.g. 30–31 Mar 2026.
- `fmtTime` shows real minutes (9:15 was shown as 9:30). Output is unchanged for the concept's half-hour data.

## Architecture (how the port works)

- **CSS.** `src/app/(app)/terminal.css` is **generated**: `node scripts/scope-terminal-css.mjs` copies the concept's `styles.css`, scoped under `.gh-terminal`, with keyframes prefixed `t-`. Never hand-edit it. GrayPortal-only rules go in `terminal-adapter.css`. `terminal-legacy.css` is the old skin, kept only for un-ported screens; delete it once every screen is ported. The layout imports them in the order legacy → generated → adapter.
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

## Remaining screens to port (concept file → real route)

| Concept | Real route | Notes |
|---|---|---|
| `ClientProfile.jsx` (5 tabs) | `/clients/[id]` | Biggest. Wire every button to the real actions in `clients/[id]/tabs/*` and `clients/actions.ts`: invites, password email, documents, roadmap, ideas, tools, team, channels, meetings, activity, features, services, referrals, one-off payments (`tCreateOneOffPayment` exists), brand tint and logo (`setBrand` → persist). Health components: the DB stores 0–25 each; `load.ts` already ×4. |
| `Comms.jsx` Triage / Templates / Campaigns | `/email-triage`, `/email-templates`, `/email-campaigns` | The concept's triage has folders (needs-reply/clients/leads/fyi). Real data has *unmatched* inbound plus client emails (`listUnmatchedInboundEmails`, `listClientEmails`); map them to folders and keep the MatchContact/alias/dismiss actions. Campaign detail `/email-campaigns/[id]` has no concept screen; use concept parts. |
| `Catalog.jsx` Pricing / GrayScale | `/pricing`, `/grayscale-products` | Keep the real edit/create actions. GrayScale requests tab uses `grayscale_requests`. |
| `Apexus.jsx` | `/apexus` | Concept mounts the real builder markup and script, with `apexus-menu.css` and a step nav. Copy `apexus-menu.css` from the concept. |
| `System.jsx` Vault / Brand / Settings / Notifications / Search | `/vault`, `/brand-guidelines`, `/settings`, `/notifications`, `/search` | Vault reveal must use the real re-auth/reveal flow (`CredentialsList`). Settings has prefs (theme, density, blur, client view), expense budgets (`tSetExpenseBudget` exists) and the real integrations, MFA and MCP sections. |
| `Analytics.jsx` | `/analytics` (**new route**; the rail links to it and it 404s today) | Presets: revenue/sales/clients/marketing/operations. Use only real data, not the concept's `analytics` mock. |

Pages with no concept screen (`deals/[id]`, `companies/[id]`, `contacts/[id]`, `contractors/[id]`, `clients/onboard`, `finance/personal/history`, `finance/personal/[id]`): rebuild them in concept parts (`.screen`, PageHead, Panel, KV, table) so they match.

## Verification: blocked on a local sign-in

- JSX isn't type-checked, so **screens must be seen running**. The localhost:3000 dev server (in this folder, serving the checked-out branch) needs Max to **sign in once** in Chrome. Claude can't sign in (credentials).
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

1. Ask Max to merge #49 (now includes the Work screens).
2. Get Max to sign in on localhost and verify every ported screen against the concept. Fix differences.
3. Port the client profile, then Comms, Catalog/Apexus, System, Analytics, then the no-concept detail pages.
4. Delete `terminal-legacy.css` and the old `src/components/ui/terminal/*` / `TerminalRail.tsx` once nothing uses them.
5. Update the RULES.md §7 status.

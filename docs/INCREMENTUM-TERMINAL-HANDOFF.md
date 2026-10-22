# Handoff: Incrementum Terminal UI → real GrayPortal

Started 2026-10-22. **Task (Max):** "make this the new Incrementum UI on the official GrayPortal. Exactly this as is. Port the code and design directly over to make this real." The design source is the concept app `OS/incrementum-terminal-concept`, which Max approved after several rounds of notes.

Read this first, then `grayhorizon-docs/Terminal UI/RULES.md` §4 (component table, Console onwards) and §8 (Incrementum status, Max's 22 Oct notes, and the real-build gaps).

---

## Where things are

| What | Where |
|---|---|
| **This work (git worktree)** | `OS/grayportal-incrementum`, branch `incrementum-terminal-ui`, cut from `origin/main` (0470a68) |
| Design source (concept, mock data) | `OS/incrementum-terminal-concept`, `npm run dev`, port 5191. Settings → "Concept only" switches pre-launch / live demo data |
| Main GrayPortal checkout | `OS/grayportal`, on branch **`terminal-exact`**: **another session's WIP** (exact GrayPortal concept port). **Don't touch it.** |
| Worktree setup | `node_modules` is a junction to `../grayportal/node_modules`; `.env.local` was copied in. Both are gitignored |

Run everything from the worktree. `npx tsc --noEmit -p .`, `npx vitest run`, `npx next build`, `npx next dev`.

## Rules and decisions (don't re-litigate)

- **Exactly the concept**: same compositions, classes, wording, behaviour. The concept files are the spec: `src/terminal.jsx` + `src/terminal.css` (kit), `src/styles.css` (base Terminal kit), `src/incrementum.css`, `src/parts.jsx`, `src/App.jsx` (shell) and `src/screens/*.jsx`.
- **Light by default**, with a dark toggle and a privacy-blur toggle in the header. No "Project Incrementum" text in the header.
- **Rail:** identity card with no art: gold "Project Incrementum" strip, PHASE (links to the roadmap), ADS LIVE ("TBC · set date" until set; opens a pop-up to set, change or clear `launchDate`). Block buttons: Home, Launch (pre-launch only), Leads, Clients, Contractors, Services & Pricing, Tasks, Payouts. Folders (closed by default, open state remembered): Plan (Goals, Roadmap, Weekly review, Launch checklist when live), Deliver (Capacity, Playbooks), Learn (Analytics, Experiments, Archive), System (Settings). "Return to Gray Portal" sits at the foot.
- **One page scroller**: the window scrolls; the header and rail are sticky.
- **Engagements are called Clients.** Move the route `incrementum/engagements` → `incrementum/clients` and add redirects from the old paths (`next.config` redirects, or tiny redirect pages). `act()` in actions.ts and compute.ts already link to `/incrementum/clients/…`.
- **Payments aren't tracked** (Max's Xero isn't fed from his bank). A month is delivered → approved → report sent → invoiced, plus an optional **Settled** tick. Settled stamps `clientPaidAt` + `payoutPaidAt` together, so the contractor workspace (`/work/payouts`, `db/sql/031` views) shows "paid". Payouts is a **schedule**: invoice clients / pay contractors / you keep, a per-contractor "who to pay" list, and "Mark <month> settled". There's no "payouts on time" metric anywhere.
- **MRR** is shown as "Monthly revenue (MRR)".
- **Every signed client is a full GrayPortal client**, on any term (0 = month to month).
- **Review email**: once the minimum term is served, the client page offers "Send review email" (Google review request, placeholder template, sent via Gmail like outreach). Also an attention item, and the tile hint "Ask for a review".
- **Contractors** (nightclub staff screen): side card with no art, only the "Gray Horizon Team" strip plus ON THE BENCH and RECRUITING rows, and the note "On the bench = Confirmed or Onboarded…". Filters: service, role, works-with size S/M/L, max rate (range), bench only, paused/not a fit. Service slots (assigned / OPEN / locked; clicking one filters).
- **Leads** = the GrayPortal Pipeline layout (from `OS/grayportal-terminal-concept/src/screens/Pipeline.jsx`), already ported in the concept's `Leads.jsx`.
- **Don't deploy, push or merge without Max.** The DB change must be applied by Max first (paste the APPLY file).

## Done so far (uncommitted at handoff → committed as "WIP" on the branch)

**Database**
- `src/lib/db/schema.ts`: `incrementum_settings.min_bench` (int, default 2), `incrementum_settings.low_slots_warn` (int, default 1), `incrementum_engagements.review_requested_at` (timestamptz).
- `db/migrations/0040_incrementum_terminal.sql` (+ meta snapshot/journal) generated with drizzle-kit.
- `db/APPLY-incrementum-terminal-2026-10-22.sql`: the one-paste file for Max (the columns + switches the "payouts on time" phase criterion to tick-by-hand). **Not applied yet.** Note: `terminal-exact` may also add migration 0040; renumber at merge if so.

**Logic** (`src/lib/incrementum/`)
- `registry.ts`: `payouts_on_time_pct` removed; MRR label "Monthly revenue (MRR)"; paying clients / profit vs spend / full loop descriptions updated.
- `seeds.ts`: Phase 1 criterion is tick-by-hand.
- `compute.ts`:
  - Paying clients = an invoiced month.
  - Profit vs ad spend = invoiced months' (invoice − payout) − ad spend.
  - Full loop = delivered + approved + report + invoiced.
  - Payout-on-time calculation removed.
  - **Attention:** the pay/chase items are replaced by "Invoice X for <Mon>" and "Ask X for a Google review".
  - **`capacityRules(state)`** (slotsPer, recruitDays, minBench, lowSlots). **`computeCapacity`** uses them and now returns `low`, `bench[]` (with `contractorServiceId` for inline slot edits) and `clients[]` (with slot weight); next moves use minBench / `low`.
  - **`matchContractors(state, filter)`**: the bench filter, built on the same rules as `roleCandidates`.
- `tests/lib/incrementumCompute.test.ts` fixture updated. Both compute test files pass (27 tests).

**Data layer** (`src/lib/dal/incrementum/`)
- New `grayportal.ts`:
  - `addClientContact`: the contact on the client's company.
  - `copyLeadHistory`: the lead's message, notes and outreach copied to GrayPortal `activities` on that contact.
  - `writeEngagementServices`: lines become `client_services` at the line prices, tagged "Incrementum: … (line xxxxxxxx)", so a re-sync updates them. Only catalogue-linked lines can go across.
  - `syncEngagementServicesToGrayPortal(engagementId)`.
  - `getGrayPortalLink(engagementId)`: client, company, contacts, portal logins and client services, for the "In GrayPortal" view.
- `leads.ts` `onboardLeadAsClient`: accepts `minTermMonths` (0–60, default package's or 3); creates the contact, copies history, writes services.
- `engagements.ts`:
  - `stampCycle` accepts `"settled"`.
  - `setEngagementSlotWeight`.
  - `addNewIncrementumClient` (Add client → New: `onboardClient` + contact + engagement + package lines + services sync).
  - `startEngagementForClient` (Add client → existing GrayPortal client: engagement + package lines + services sync).
- `npx tsc` passes apart from the two old pages below and the old `tests/dal/requireClientScope.test.ts` error, which was there before this work.

## Still to do (in order)

1. **Data layer, rest**
   - `planning.ts`: make `updateIncrementumSettings` partial (only write keys that were sent; the old full form wrote defaults for missing fields). Add `setLaunchDate(date | null)` and `saveCapacityThresholds({ defaultSlotsPerContractor, minBench, lowSlotsWarn, defaultRecruitDays })`.
   - `contractors.ts`: `setContractorServiceSlots(id, slots | null)`. Don't use `upsertContractorService`: it overwrites the rate.
   - `outreach.ts`: `sendReviewRequest(engagementId, { to, subject, body })`. Use `sendGmail`, the same rate limit as `sendOutreachEmail`, log an `incrementum_activities` row (entityType "engagement", type "email"), and set `reviewRequestedAt`.
2. **Actions** (`app/(incrementum)/incrementum/actions.ts`):
   - New: `setLaunchDateAction`, `saveCapacityThresholdsAction`, `setContractorSlotsAction`, `setSlotWeightAction`, `addClientAction` (mode existing | new → `startEngagementForClient` / `addNewIncrementumClient`), `sendReviewRequestAction`, `syncClientServicesAction`.
   - `onboardLeadAction`: pass `minTermMonths`.
   - `updateCycleAction`: keep the paid fields (Settled = both).
   - Redirect targets: `/incrementum/engagements/` → `/incrementum/clients/`.
   - Keep the `_back` + `?ok=` pattern.
3. **CSS**: port the concept's `styles.css` + `incrementum.css` + `terminal.css` into `app/(incrementum)/incrementum/incrementum.css`.
   - **Scope every rule under `.gh-incrementum`** (Next keeps layout CSS loaded after navigating away).
   - `:root` tokens become `.gh-incrementum`; `:root[data-theme="dark"]` becomes `.gh-incrementum[data-theme="dark"]`; same for `data-private`.
   - Map `--f-body` / `--f-display` / `--f-mono` to the app's font variables (check the root layout and `tokens.css`).
   - Drop the concept's `body { overflow: hidden }` and `.content` scroll; use the one-scroller block from the end of the concept's `incrementum.css`.
   - The old Incrementum CSS can go once nothing uses `inc-*` / `gh-*` classes (check `IncrementumHomeBanner`, which the GrayPortal Home uses, and `/print/incrementum`).
4. **Kit** (`components/incrementum/terminal/`): port `terminal.jsx` and the `parts.jsx` pieces to TSX.
   - **Server-first:** pages stay server components. Views, tabs, filters, selected tiles and folders are **URL search params via `<Link>`**, not state. Folds are native `<details>`. Mount animations are CSS `@keyframes` with only a `from` (width 0 / dashoffset), so they need no JS.
   - **Small client components only:** `ModalTrigger` (native `<dialog>`, closes on form submit), `ClickRow` (opens a dialog by id), `AutoSubmitForm` (range/selects and inline slot inputs submit on change), `ThemeToggle` / `PrivacyToggle` (attributes on `.gh-incrementum` + localStorage), the launch-date pop-up, and the existing `AddLinesDialog` / `RoleAssignDialog` restyled to the concept's pickers and the green "Add contractor" candidate rows.
   - Use `SubmitButton` with `className="btn btn-primary"` etc.
5. **Shell**: `layout.tsx` + `IncrementumRail.tsx` per the decisions above. Keep `IncrementumEntryOverlay`, `error.tsx` and `loading.tsx`. Restyle `Flash` as the concept's toast.
6. **Pages**: rebuild each on the real snapshot + DAL, copying the concept screen's composition. Map:
   - **Home**: console (status, level bars, ledger, monthly profit total + tier bar, slot columns, BigAction), master control tiles, Next up + moves, Team, goal rings, roadmap tabs. Customise uses `saveHomeLayout` with the new section keys `console, tiles, next, team, goals, roadmap`.
   - **Launch**: hangar rings (big readiness ring + a ring tile per gate via `?gate=`), checklist rows, "Ads go live" BigAction (`setLaunchDateAction` today).
   - **Goals / Roadmap / Review**: as `Plan.jsx` (goal ring tiles open an edit dialog; phase hangar tabs via `?phase=`; Advance BigAction opens a retro dialog → `advancePhaseAction`; review form + "Complete review" BigAction).
   - **Tasks**: agency tree via `?list=`.
   - **Services**: offer rings + price-list rows + package dialog.
   - **Leads**: Pipeline layout via `?stage=`, a quick-view dialog per row, New lead dialog. **Lead profile**: bunker with views via `?view=`; Onboard dialog with the min-term select + "Creates in GrayPortal" checklist.
   - **Clients** list (MCT tiles + "Add client" dialog with existing/new tabs). **Client** profile: bunker, views `cycle | quote | team | notes | grayportal | modules | details`; BigAction = next month step / Send review email / Open next month; "In GrayPortal" view from `getGrayPortalLink` + "Sync services" button.
   - **Contractors**: nightclub staff via `matchContractors` + `?service=&role=&sizes=&max=&bench=&off=&sel=&view=bench|pipeline|access`. **Contractor profile**: bunker.
   - **Capacity**: stock columns via `?service=`; inline slot/weight edits; thresholds form; "How it works".
   - **Playbooks**: agency tree (keep `/playbooks/[id]`).
   - **Payouts**: schedule, as in the concept's `Money.jsx`.
   - **Analytics**: as in the concept.
   - **Experiments / Archive**: agency.
   - **Settings**: console with side views via `?view=` (pricing & targets, capacity thresholds, roles, hours, connections; the concept-only view is dropped).
7. **Tests**: add unit tests for `matchContractors`, `capacityRules`/`low`, the new attention items and the metrics with invoiced-only cycles. Run `npx vitest run`, `npx eslint`, `npx tsc --noEmit`, `npx next build`.
8. **Check in the browser** (`npx next dev` in the worktree): every route, light and dark, then compare side by side with `localhost:5191`.
9. **Docs**: update RULES.md §8 ("ported"), the plan doc §14, and memory. Then tell Max:
   - **(a)** paste `db/APPLY-incrementum-terminal-2026-10-22.sql`,
   - **(b)** the PR is ready,
   - **(c)** still open: an Incrementum badge in GrayPortal's Clients list (left out to avoid clashing with `terminal-exact`), and lines without a catalogue item can't be written to `client_services`.

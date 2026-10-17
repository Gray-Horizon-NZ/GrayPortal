# Project Incrementum: Plan

**For:** Max + any Claude Code session that builds it
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Status:** BUILT on branch `incrementum` (2026-10-18). **Database applied 2026-10-18** (Max ran `db/APPLY-incrementum-2026-10-18.sql` in Neon). App code not yet deployed: deploy the branch next. See §14 for what's built and what's still open.
**Started:** 2026-10-17
**Business source:** `OS/grayhorizon-docs/27ADS.md` (2027 ads plan: contractor-fulfilled retainers, Google Search ads, $2k runway)
**System context:** `Master-Brief.md` (what GrayPortal already is) and `Open-Work-Brief.md` §0 (non-negotiable build rules: security is structural, DAL first → MCP → UI, don't anticipate, MCP risk tier on every new write).

This doc is the **single source of truth** for Incrementum. `Open-Work-Brief.md` §19 is now just a pointer here.

---

## Contents

1. What Incrementum is, what "proven" means, and the growth phases
2. Identity and entry (sidebar, Home banner, entry animation, master task column)
3. Brand and visual system
4. Structure: tab rail
5. Incrementum Home and widgets
6. Launch Readiness checklist
7. Tabs in detail
8. Accountability system
9. Data model sketch
10. What already exists, and the gaps
11. Security and MCP risk tiers
12. Build order
13. Open questions

---

## 1. What Incrementum is, what "proven" means, and the growth phases

**One line:** the all-in-one management space inside GrayPortal for setting up, running, proving and scaling the 27ADS scheme. Clients are won through ads and outreach, the work is delivered by contractors, and Max manages the relationships and the margin.

**The aim:** move Max from doing the work to running the business, and prove the model makes money *without* Max's own hours going into delivery.

### 1.1 Proof criteria (pass/kill lines, decided before spending)

These start as the 27ADS estimates. Max confirms the final numbers in Gate F of the checklist (§6) and they get recorded in the Experiments tab. Incrementum then shows each one live: green when it passes, red when it fails.

| Question | Metric | Pass line (draft) | Kill / fix line (draft) |
|---|---|---|---|
| Do ads bring leads? | Month-2 checkpoint (~$800 spent) | ≥ 4 leads, of which ≥ 2 qualified, **and** landing page conversion ≥ 3% | < 2 leads, or conversion < 2% → pause, fix offer/page |
| Do leads buy? | Close rate on qualified paid leads | ≥ 10% | < 5% after 15+ qualified leads |
| Is it worth it per client? | Average profit $ per client per month | ≥ $700 | < $400 |
| Do clients stay? | Average months retained | ≥ 6 | Clients leaving before month 3 |
| Is Max out of delivery? | Max's hours per client per month | ≤ 3 | > 6 |
| Is it paying back? | Cumulative profit vs ad spend | Break-even = 1 client × 3 months | No client by end of month 4 |
| **Life change** | Monthly Incrementum profit vs the **freedom number** (§8) | Hits freedom number | n/a, it's the north star |

**Why the month-2 line changed (2026-10-17):** 27ADS said "≥ 5 qualified leads by $800". Max questioned whether that's too high, and it is. $800 buys ~80–265 clicks at NZ $3–10 CPC, and keywords like "google ads agency" sit at the expensive end. At ~$8/click that's ~100 clicks × 3–5% conversion ≈ 3–5 leads *in total*, with maybe half qualified. Lead counts this small are noisy, so the checkpoint also uses a leading indicator (landing page conversion rate), which says more about whether the page/offer works than 2 vs 4 leads does.

### Freedom number tiers (set 2026-10-17)

Measured as **monthly profit from Incrementum alone**. Max's longer-term aim is to stop doing marketing delivery himself.

| Tier | Monthly Incrementum profit | Roughly | Phase |
|---|---|---|---|
| **Target** | **$10,000** | ~7–9 clients on the launch package + GrayScale add-ons (§7.1) | Late Phase 2 → Phase 3 |
| **Gold** | $15,000 | ~11–13 clients | Phase 3 |
| **Diamond** | $20,000 | ~15–17 clients | Phase 4 |

Home's Freedom number widget shows the bar to $10k, with Gold and Diamond as markers further along it.

### 1.2 Growth phases (gated)

Max, 2026-10-17: *"phase 1, hit those goals and KPIs, then move onto phase two"*, tied to client count and contractor count.

The whole project runs in phases. **Each phase has exit criteria, and the next phase doesn't unlock until they're all met.** That stops the classic mistake of scaling (more ad spend, a second service) before the first version is proven. The proof criteria in §1.1 are mostly Phase 1's exit criteria.

| Phase | Name | Ad budget | Services | Active clients | Confirmed contractors* | What it's for |
|---|---|---|---|---|---|---|
| **0** | **Foundations** | $0 | 1 | 0 → 1 (outreach pilot) | 3 (≥ 1 backup) | Get set up: everything in the Launch checklist (§6) |
| **1** | **Prove** | $400/mo | 1 | 1 → 3 | 3 | Show that ads → clients → contractor delivery → profit works at all |
| **2** | **Repeat** | $600 → $800/mo | 1 | 4 → 8 | 4 | Show it works *reliably*: retention, on-time delivery, Max out of delivery |
| **3** | **Expand** | $1,000+/mo | 2 | 9 → 15 | ~7 (across 2 services) | Add the second service; referrals as a second channel |
| **4** | **Delegate** | Reinvested % of profit | 2–3 | 15 → 25+ | ~10+ | Hire an account manager; Max runs the business, not the accounts. Freedom number reached |

\* Contractor targets aren't fixed numbers. They come from the Capacity formula (§7.5): `ceil(clients ÷ average slots per contractor) + 1 backup per service`. The figures above assume ~4 client slots per contractor and **recruit for the top of the phase's client range before entering it**, which is "recruit ahead of demand" from 27ADS. They update automatically once real capacity data exists.

#### Exit criteria (draft numbers, Max confirms; ⚙ = tracked automatically)

**Phase 0 → 1 (Foundations → Prove)**
- ⚙ Every launch-critical Launch checklist item done or N/A (Gates A–I)
- ⚙ ≥ 3 confirmed contractors for the launch service, incl. ≥ 1 backup, agreements signed
- ⚙ Pilot loop completed once: sell → deliver → approve → invoice → client pays → contractor paid
- ⚙ Tracking verified: a test lead arrives in Leads with gclid/UTM

**Phase 1 → 2 (Prove → Repeat)**
- ⚙ ≥ 2 paying clients through Incrementum (≥ 1 from ads)
- ⚙ ≥ 1 client retained ≥ 3 months (break-even, 27ADS)
- ⚙ Average profit per client ≥ the pass line (§1.1)
- ⚙ Max's hours ≤ 3 per client per month, averaged over the last 2 months
- ⚙ Cost per lead and close rate at or better than the pass lines in §1.1
- ⚙ 100% of contractor payouts paid on time (trust with contractors)
- Manual: Phase 1 retro written (Experiments)

**Phase 2 → 3 (Repeat → Expand)**
- ⚙ ≥ 6 active clients, held for 4 consecutive weeks (so one lucky month doesn't count)
- ⚙ Average retention trending ≥ 6 months; no more than 1 client lost in the last 3 months
- ⚙ On-time delivery ≥ 90% over the last 2 months
- ⚙ Incrementum monthly profit ≥ an agreed figure (e.g. 50% of the freedom number)
- ⚙ Bench OK for the launch service, with ≥ 1 free slot
- ⚙ Weekly review streak ≥ 8
- Manual: the backup contractor has successfully taken over at least one account (the playbook works without the original contractor)
- Manual: second service chosen and its offer drafted (Phase 3 Gate A)

**Phase 3 → 4 (Expand → Delegate)**
- ⚙ ≥ 12 active clients across 2 services
- ⚙ Second service has ≥ 3 clients and margin ≥ the floor
- ⚙ Incrementum profit ≥ $10k (the freedom number) for 2 consecutive months
- ⚙ Bench OK on both services
- Manual: account manager role written up and costed
- **Hiring the account manager is NOT an exit criterion.** It shows as a **Recommended next move** (below) once profit covers the account manager's cost *and* still leaves ≥ $10k. Max decides when.

**Phase 4:** no exit. It's the steady state. Track the freedom number, profit per hour of Max's time, and reinvestment.

#### How phases behave in the system
- The **current phase is always visible**: in the Incrementum header ("Phase 1 · *Prove*") and as the top widget on Home (§5.2, Phase progress).
- Each exit criterion is shown with live progress, e.g. "Active clients 2 / 6", "Max hours 3.4 / ≤ 3". When everything is green, an **"Advance to Phase N"** button appears. Advancing is a deliberate act Max confirms, and it asks for a phase retro (saved in Experiments).
- **Entering a phase seeds its work automatically:**
  - its goals (client and contractor targets, profit target)
  - its roadmap milestones
  - a short "phase entry" checklist (e.g. Phase 2: raise budget to $600, recruit the 4th contractor; Phase 3: run Gates A–F again for the second service)
  - the ad budget step
- **Contractor counts are driven by client counts.** Capacity (§7.5) reads the *next* phase's client range and shows the recruit-by date, so contractors are already in place when the clients arrive.
- **Falling back:** if a passed criterion stops holding (e.g. clients drop from 6 to 4), Incrementum shows a **"Hold"** warning on the phase rather than moving it back. Max decides whether to pause spend increases. Each phase also has **kill/fix lines** (from §1.1). Hitting one pins an alert to Home until Max logs a decision in Experiments.
- Phase targets and criteria are **editable** (the numbers above are drafts). Edits are logged, so the bar can't be quietly lowered.
- **Recommended next move alerts** (Max, 2026-10-17). These are rule-based prompts, not gates, shown on Home and in Needs attention, and each can be dismissed with a note. Examples:
  - *"Profit now covers an account manager (~$X/mo) and still clears $10k. Consider hiring."*
  - *"All Phase 1 criteria met. Advance to Phase 2 and raise the ad budget to $600."*
  - *"Google Ads bench will be full at 2 more clients. Start sourcing a contractor by 25 Jan."*
  - *"Client X is in month 3 and healthy. Ask for a referral."*
  - *"Client X has no GrayScale product. Offer one (20% retainer discount)."*
  - The rules live in an app-layer registry, so new ones are added in code without a schema change.

---

## 2. Identity and entry

Gray Portal is the door, Incrementum is the room behind it. It must feel like its own place.

### 2.1 Route and shell
- Route `/incrementum`, in its own route group `src/app/(incrementum)/incrementum/` (2026-10-18: full screen, outside the GrayPortal shell, with "← Return to Gray Portal" in its sidebar). Admin-only at the DAL and RLS.
- Its own header: the "Project *Incrementum*" wordmark, an "← Gray Portal" back link, and its own tab rail (§4).
- Same auth/session/DAL as the rest of GrayPortal. Not a separate app.
- The **whole space renders in light mode** (§3), while the rest of the admin app stays dark.

### 2.2 Sidebar entry
- In `navItems` (`src/app/(app)/layout.tsx`), place `{ href: "/incrementum", label: "Project Incrementum", … }` straight after Home with **no `group`**, so it renders in the pinned, unindented block (`groupNavItems` / `AppShell.tsx`).
- The label is **system gold** (`var(--gh-accent)`, `#c2a468`) in every state, not only when active. Add an opt-in on `ShellNavItem` (e.g. `accent?: true`) that `AppShell.tsx` turns into a modifier class, so only this item turns gold.
- Icon TBD (lucide): `TrendingUp`, `ChartNoAxesColumnIncreasing` or `Layers`.

### 2.3 Home mini banner: "Enter Project Incrementum"
- **Position (confirmed):** the same row as "Welcome back" on GrayPortal Home (`src/app/(app)/page.tsx`), **far right**. The welcome block becomes a flex row (`space-between`, `align-items: center`), with the greeting on the left and the banner on the right, both above the existing hairline. "Far right" means the edge of the page container (`maxWidth: 1200`).
- **Mini:** about as tall as the greeting, ~280–340px wide. It wraps under the greeting at full width on narrow screens.
- **Light palette** (§3): background `--gh-lt-ink` `#f7f5ef`, text `--gh-lt-text`, hairline `--gh-lt-line`, arrow/CTA `--gh-lt-brass`. It's the one light object on the dark dashboard, so it reads as a doorway.
- Content: eyebrow "Project Incrementum", line "Enter Project Incrementum →". Later: one live figure (e.g. launch readiness % before launch, freedom-number progress after). The whole banner is the link.

### 2.4 Entry animation: "Entering Project Incrementum"
The same animation as GrayPortal's boot (`src/components/ui/SessionBootOverlay.tsx`), in the light palette.

| Part | GrayPortal (dark) | Incrementum (light) |
|---|---|---|
| Background | `--gh-bg` | `--gh-lt-ink` `#f7f5ef` |
| Ring track | `--gh-border` | `--gh-lt-line` `#e0dbca` |
| Ring draw + bar fill | `--gh-accent` `#c2a468` | `--gh-lt-brass` `#9b8353` |
| Text | light text | `--gh-lt-text` `#1c1c1c`, eyebrow `--gh-lt-text-dim` |
| Eyebrow | "Gray Horizon" | "Gray Horizon" |
| Title | "Welcome *back*" | "Entering *Project Incrementum*" |

Build notes:
- Split the overlay markup into a presentational `BootOverlayView` (`eyebrow`, `title`, `tone: "dark" | "light"`). `SessionBootOverlay` keeps its logic with `tone="dark"`. The new `IncrementumEntryOverlay` uses `tone="light"`. The animation stays defined in one place (`globals.css` ~795–830: `.gh-welcome-ring-fill`, `.gh-welcome-line`, `.gh-welcome-bar-fill`).
- Mount it in the Incrementum layout, so it plays on **entry** (sidebar, banner, direct URL, refresh), not when switching tabs inside Incrementum.
- `incrementum/loading.tsx` renders the light overlay, never the dark admin skeletons, so there's no dark flash.
- **Separate ready signal.** `window.__ghAppReady` is already `true` on the dashboard, so reusing it would end the overlay instantly. Use `__ghIncrementumReady` / `"gh-incrementum-ready"`, reset it when the overlay mounts, and fire it from `IncrementumReadySignal` on Incrementum Home. Keep the 6s safety timeout.
- It plays on **every entry**, not once per tab (unlike `gh_booted`). It respects `prefers-reduced-motion` (80ms hold, no fade). Fade *in* over ~200–300ms so going from dark to light isn't a white flash.
- Same 1850ms minimum hold for now. Shorten to ~1.2s if it feels slow after real use.

### 2.5 Incrementum column in the Master Task View
- Add `project_incrementum` to `INTERNAL_LIST_KEYS` (`src/lib/dal/tasks.ts`) **after** `gray_horizon_focus`, labelled "Project Incrementum" (also update the label map in `src/app/(app)/tasks/TaskRow.tsx`). `MasterTaskView.tsx` builds the internal columns in that order, so it lands third. No migration needed (`internalList` is text).
- **Gold outline:** `1px solid var(--gh-accent)` on that column only (a class like `gh-task-col--incrementum`).
- Google Tasks: pick a list for the new key in Settings (`internal_tasklist_mappings`). No schema change.
- Only **main-list** tasks show here. Sub-lists don't (§7.6).

---

## 3. Brand and visual system

Incrementum uses GrayPortal's existing brand system (`src/app/tokens.css` is the only place visual values live) with the **client portal's light-mode palette** as its colour identity. Nothing new is invented. It should look like Gray Horizon in daylight.

### 3.1 Colour: shared light tokens
The light palette exists today only inside `.ghp-root[data-portal-theme="light"]` (`src/app/(portal)/portal-theme.css`). Promote it to `tokens.css` under new shared names. The portal's light block then points at them, and Incrementum reads them too. One source of truth, so the two can't drift.

| Token (new) | Value | Use in Incrementum |
|---|---|---|
| `--gh-lt-ink` | `#f7f5ef` | Page background |
| `--gh-lt-panel` | `#ffffff` | Cards / widgets |
| `--gh-lt-panel-2` | `#f1eee3` | Secondary surfaces, table header rows, hover |
| `--gh-lt-line` | `#e0dbca` | Hairlines, borders, ring track |
| `--gh-lt-text` | `#1c1c1c` | Primary text |
| `--gh-lt-text-dim` | `#8a8776` | Eyebrows, labels, secondary text |
| `--gh-lt-brass` | `#9b8353` | The **one** accent: active tab, primary CTA, progress fills, featured values |
| `--gh-lt-good` / `-warn` / `-danger` | `#668469` / `#976637` / `#9a5e42` | Status only, always with a text label or icon |
| `--gh-lt-chart-1` | `#2a78d6` | Data encoding in charts (never brass) |

The portal stylesheet warns about circular custom-property references. That only happens when the same `--gh-*`/`--ghp-*` names are aliased in both directions. These are new, distinct names, so a one-way reference is safe. Still check the portal's light theme visually after the change.

Incrementum's layout wraps everything in a `.gh-incrementum` scope that maps surface/text/accent to these tokens.

### 3.2 Brand rules (from tokens.css, applied to light)
- **Type:** headings in Cormorant (`--gh-font-display`), with the key word in *italic* the same way GrayPortal does ("Entering *Project Incrementum*", "Launch *readiness*"). Body text in DM Sans (`--gh-font-body`). Eyebrows and labels are uppercase and tracked (`--gh-tracking-wide`/`-wider`, `--gh-text-xs`). Big numbers (profit, %, counts) in the display serif.
- **Geometry:** radius 0 everywhere (`--gh-radius`), circles only for rings, avatars and status dots.
- **Depth:** no drop shadows. Layer with tones (ink → panel → panel-2) and hairlines (`--gh-lt-line`).
- **Layout:** joined hairline grids (`gh-grid-joined`, as on GrayPortal Home), with widgets sharing borders rather than floating as separate cards. Generous spacing (`--gh-space-6`/`-8`).
- **Gold discipline:** brass only for highlight and action. Never for borders in general, body text or decoration. Status colours never stand in for brass and vice versa.
- **Motion:** `--gh-ease`, fade-up and stagger on load (`gh-animate-fade-up`, `gh-stagger`), progress rings and bars animate their fill once. Everything respects `prefers-reduced-motion`.
- **Charts:** built with the dataviz skill, using `--gh-lt-chart-1` and its validated palette for data, brass only to mark a target or goal line.
- **Icons:** lucide, same stroke weight as the main app.
- **Wordmark:** "Project *Incrementum*" set in Cormorant. Optional later: a small mark (ascending stepped bars) made with the brandkit skill. Not needed for v1.

### 3.3 Light/dark boundaries
| Element | Theme |
|---|---|
| GrayPortal sidebar label | Dark app, system gold `#c2a468` |
| GrayPortal Home mini banner | Light object on a dark page |
| Master Task View column outline | Dark app, system gold `#c2a468` |
| Entry animation and everything under `/incrementum` | Light |

---

## 4. Structure: tab rail

A left tab rail inside the Incrementum shell, grouped like GrayPortal's main sidebar:

| Group | Tab | Purpose |
|---|---|---|
| **Command** | **Home** | The widget dashboard (§5) |
| | **Launch** | The Launch Readiness checklist (§6) |
| | **Goals** | Targets tied to live numbers, including the freedom number |
| | **Roadmap** | Phases, milestones, deadlines |
| | **Tasks** | Main list (on the master view) + sub-lists (not on it) |
| **Sell** | **Services & Pricing** | Editable service price list (contractor quote + markup), packages/offers, profit check |
| | **Leads** | Lead inbox, response clock, qualification, discovery calls |
| **Deliver** | **Engagements** | Live client work: monthly cycle, approvals, reports |
| | **Contractors** | Recruiting pipeline + bench + Gray Horizon Team |
| | **Capacity** | Contractors-per-client planning |
| | **Playbooks** | Per-service written processes + contractor welcome pack |
| **Money** | **Payouts** | Pay-when-paid ledger |
| | **Analytics** | Funnel, unit economics, retention, Incrementum P&L |
| **Learn** | **Experiments** | Change log + pass/kill tests |
| | **Archive** | Ended engagements, closed phases, retired contractors, old offers |

The existing `/contractors` page (`src/app/(app)/contractors/`, name + specialty only) is replaced by the Contractors tab. Remove its sidebar entry and point `/contractors` at `/incrementum/contractors`.

---

## 5. Incrementum Home and widgets

The landing page of the space. Every widget is a summary of one tab with a click-through to that tab. Home itself owns no data.

### 5.1 Two modes
Home changes based on where the project is:
- **Pre-launch mode** (until the launch date in Launch is ticked): the Launch Readiness widget and the main task list lead.
- **Live mode** (after launch): freedom number, leads and engagements lead, and Launch Readiness shrinks into "Post-launch milestones".

The mode is automatic, and Max can override it from the Customise panel.

### 5.2 Widget catalogue

| Widget | Source tab | Shows | Default size (of 12 cols) |
|---|---|---|---|
| **Phase progress** | Phases (§1.2) | Current phase name + number, each exit criterion with live progress (e.g. "Clients 2 / 6"), overall % to next phase, "Advance" button when everything is green, any Hold/kill alerts | 12 (top of Home, always) |
| **Freedom number** | Goals + Analytics | Monthly Incrementum profit vs the freedom number: big serif figure, brass progress bar, months-to-target at the current pace | 8 |
| **Launch readiness** | Launch | Ring: % of launch items done; list of gates with their own %; next 3 blockers | 4 (pre-launch: 8) |
| **Weekly review** | Accountability (§8) | "Review due Monday" / "Done ✓ 21 Oct"; button opens the review | 4 |
| **Needs attention** | All | One ranked list: leads waiting, overdue tasks/deliverables, approvals waiting, payouts due, contractor follow-ups, off-pace goals | 6 |
| **Goals pace** | Goals | The 3 goals nearest their deadline: progress vs pace line, status label | 6 |
| **Lead inbox** | Leads | New/unanswered leads with a live response clock; this month's lead count vs target | 4 |
| **Sales pipeline** | Leads | Counts by stage (new → qualified → call booked → proposal → won) | 4 |
| **Payouts** | Payouts | Client invoices awaiting payment, payouts now due, paid this month | 4 |
| **Gray Horizon Team** | Contractors | Onboarded contractor cards (photo, title, services, availability dot) | 12 (horizontal strip) |
| **Capacity** | Capacity | Per service: slots used/total bar, "Bench OK" label, next recruit-by date | 6 |
| **Deadlines** | Roadmap + Tasks + Capacity | Next 14 days: milestones, task due dates, recruit-by dates | 6 |
| **Main task list** | Tasks | The Incrementum main list (same list as the master view column) with quick-add | 6 |
| **Runway** | Analytics | Ad budget spent vs $2k, months left, break-even progress | 3 |
| **Experiments** | Experiments | Latest change logged + its result; tests running | 3 |
| **Unit economics** | Analytics | Avg margin %, MRR, profit per hour of Max's time | 4 |
| **Engagement health** | Engagements | Each live client: health label, next deliverable, months retained | 8 |
| **Roadmap strip** | Roadmap | Thin horizontal timeline: current phase highlighted, "today" marker | 12 |

### 5.3 Default layout (live mode)
```
┌────────────────────────────────────────────────────────────────┐
│ PHASE PROGRESS (12): Phase 1 · Prove · 4 of 7 criteria met     │
├──────────────────────────────────────────┬─────────────────────┤
│ FREEDOM NUMBER (8)                        │ WEEKLY REVIEW (4)   │
├────────────────────┬─────────────────────┴─────────────────────┤
│ NEEDS ATTENTION (6)│ GOALS PACE (6)                             │
├─────────────┬──────┴──────────┬─────────────────────────────────┤
│ LEAD INBOX  │ SALES PIPELINE  │ PAYOUTS (4)                     │
│ (4)         │ (4)             │                                 │
├─────────────┴─────────────────┴─────────────────────────────────┤
│ GRAY HORIZON TEAM (12)                                          │
├────────────────────────────────┬────────────────────────────────┤
│ ENGAGEMENT HEALTH (8)          │ UNIT ECONOMICS (4)             │
├────────────────────────────────┼────────────────────────────────┤
│ CAPACITY (6)                   │ DEADLINES (6)                  │
├────────────────────────────────┼───────────────┬────────────────┤
│ MAIN TASK LIST (6)             │ RUNWAY (3)    │ EXPERIMENTS (3)│
├────────────────────────────────┴───────────────┴────────────────┤
│ ROADMAP STRIP (12)                                              │
└─────────────────────────────────────────────────────────────────┘
```
Pre-launch mode (= Phase 0): Phase progress (12), then Launch readiness (8) + Weekly review (4), then Needs attention / Main task list, then Deadlines / Goals pace, then Roadmap strip. Lower-priority widgets that have no data yet are hidden (no empty widgets).

### 5.4 Customise (toggleable)
- A "Customise" panel on Home: show/hide each widget and change its order (up/down in v1, drag in v2). There's a "Reset to default" option.
- Saved per user in the database (`incrementum_home_layout`), not in browser storage, so it follows Max across devices.
- Widgets are built as a registry (`key → component, source, default size, modes`), so adding one later is a single entry, the same pattern as `INTERNAL_LIST_KEYS`.
- On mobile, widgets stack in the saved order at full width.

### 5.5 Gray Horizon Team widget
- Automatically lists every contractor at stage **Onboarded**. Paused / Not a fit removes them.
- Card: photo (initials fallback), name, public title, service chips, availability dot (available / at capacity, from Capacity), active client count, "On the team since". A gold "Gray Horizon Team" heading with a small official badge.
- Click → contractor profile. Also shown at the top of the Contractors → Bench view.
- **Never shown to clients by default.** 27ADS lists contractors and clients dealing directly as a real risk. If it's ever exposed through the client portal's `client_team_members`, show first name + title only, no contact details, as a per-engagement opt-in.

---

## 6. Launch Readiness checklist

The core of the pre-launch period, and **Phase 0's exit criteria** (§1.2). **Ads don't go live until every launch-critical item is done or marked N/A with a reason.** When Phase 3 adds a second service, Gates A–F are copied again for that service as its own checklist.

### 6.1 Mechanics
- Seeded from the template below, and **editable**: add, remove, reorder or mark N/A (with reason). It's the "buildable" part of the project.
- Each item has: status (not started / in progress / done / N/A / blocked), owner (Max or a contractor), due date, notes, evidence link (doc, URL or file), and a **launch-critical** flag.
- **Auto items** (marked ⚙) tick themselves from live data, e.g. "≥ 3 confirmed contractors" reads the Contractors tab. They can't be ticked by hand, so the checklist can't lie.
- "Make task" on any item creates a task in a Tasks sub-list, linked back to the item. When the task is done, the item ticks.
- Each gate shows % complete. The Launch readiness widget shows the overall %, counting launch-critical items only.
- Items with due dates also appear as Roadmap deadlines.
- Note: NZ legal/tax items are prompts to check with a professional. They aren't legal or tax advice.

### 6.2 Gate A: Offer and pricing
- [ ] Pick **one** first service to launch with (27ADS: ads management, SEO, content, maintenance/hosting, CRM/automation, Gray Scale)
- [ ] Define the package: what's included, what's excluded, monthly deliverables, reporting cadence, response times
- [ ] Market check: record 3–5 NZ competitor prices for the same service (Services & Pricing tab)
- [ ] Pricing rule set for each launch service in Services & Pricing (markup % on the contractor quote, default 33%, see §7.1). The resulting "from $X/month" price is checked against the market check above
- [ ] Decide GST-inclusive or GST-exclusive pricing, and state it everywhere
- [ ] Set the target contractor cost per client
- [ ] ⚙ Profit per client at or above the §1.1 pass line (Services & Pricing's automatic check)
- [ ] Set the minimum term (3–12 months) and notice period
- [ ] Decide the setup fee and/or first-month-in-advance deposit
- [ ] **Ad spend paid by the client directly** to Google (their card on their account, managed through GH's manager account). Gray Horizon never fronts client ad spend
- [ ] Decide whether to offer a risk-reversal (e.g. a "first 90 days" commitment). Optional
- [ ] Write the offer one-pager (used for the landing page, proposals and contractor briefs)
- [ ] Create the Apexus preset for the offer, so proposals are one click

### 6.3 Gate B: Legal, finance and admin
- [ ] Client MSA/SOW updated for the retainer: minimum term, advance billing, late-payment terms, client pays ad spend, liability cap, cancellation and notice (`MSA-SOW-Template.html`, legal-agreement-writer agent)
- [ ] Contractor agreement drafted: pay-when-paid, non-solicit (clients and staff), confidentiality, IP assigned to Gray Horizon/client, client data handling (Privacy Act 2020), notice period matching client terms, independence (own tools, own business, invoices GH), quality standards and rework, termination
- [ ] Lawyer review of both agreements (once)
- [ ] GST status confirmed with the accountant (registered or should be?), plus how GST-registered vs unregistered contractors are handled
- [ ] Professional indemnity insurance quoted and in place (public liability too, if advised)
- [ ] Xero: retainer invoice template, repeating invoices on, payment terms set, automatic reminders on
- [ ] Xero tracking category "Incrementum", so the scheme has its own P&L
- [ ] Payment method to cut late payment (direct debit or card on file). Optional but recommended
- [ ] Privacy policy updated (lead form data, contractors processing client data)
- [ ] Contractor payment process: how they invoice GH, when they get paid (e.g. within 5 working days of the client paying), and how that's recorded in Payouts

### 6.4 Gate C: Contractors
- [ ] Written contractor profile: skills, portfolio standard, NZ/AU time zone overlap, rate band
- [ ] ⚙ ≥ 15 candidates sourced (Contractors pipeline)
- [ ] Screening call script + scorecard
- [ ] Paid test task + marking rubric
- [ ] ⚙ ≥ 3 confirmed contractors for the launch service
- [ ] ⚙ ≥ 1 backup contractor for the launch service (bench ≥ 2)
- [ ] ⚙ Agreements signed by every confirmed contractor
- [ ] ⚙ Rates and capacity recorded on every confirmed profile
- [ ] Contractor welcome pack written (Playbooks): brand rules, client comms rules (clients go through GH only; @grayhorizon.nz alias or via Max), tools, QA standard, how payment works
- [ ] **Contractor access is safe:** a contractor-facing view is built, OR the contractor role's current reach in GrayPortal is audited and locked down (blocker before any login; see §10)
- [ ] ⚙ Contractors onboarded to GrayPortal

### 6.5 Gate D: Delivery system
- [ ] Service playbook: onboarding steps, month-1 setup, monthly routine, QA checklist (Playbooks)
- [ ] Engagement template built for the launch offer (Engagements)
- [ ] First-90-days plan template (wins scheduled early, per the 27ADS churn fixes)
- [ ] Monthly client report template
- [ ] Approval step agreed: contractor work → Max approves → client
- [ ] **Gray Horizon Google Ads manager account (MCC)** created. Client accounts are linked under it, and contractors get user access, never client logins
- [ ] GA4 / Tag Manager access model the same way (GH owns access, contractors are users)
- [ ] Credentials live in GrayPortal Vault only. Never sent by email
- [ ] Client onboarding wizard configured for this offer
- [ ] Contractor handover plan: what happens if the main contractor misses deadlines or leaves (backup takes over from the playbook + engagement history)

### 6.6 Gate E: Landing page and sales
- [ ] Dedicated landing page for the offer: clear headline, "from $X/month", what's included, named proof, a call button and short form or booking link above the fold (27ADS §6)
- [ ] Fix site issues from the 27ADS audit: gatekeeping language, phone number in the header, reply-time promise, copyright year, NZDT not NZST
- [ ] ≥ 1 named testimonial or case study (e.g. the 12.86% CTR motorcycle campaign, with permission)
- [ ] Booking link for discovery calls (Google Calendar appointment schedule for now; Tempus later)
- [ ] Lead form → `/api/leads` → Incrementum Leads, tested end to end
- [ ] Click ID (gclid) + UTM tags captured on every lead, tested
- [ ] Instant new-lead alert to Max + automatic acknowledgement email to the lead
- [ ] Response target set (e.g. < 1 business hour) and shown on the Leads clock
- [ ] Discovery call script + qualification criteria (budget, fit, decision-maker, timeline)
- [ ] Proposal → e-sign → deposit invoice flow tested

### 6.7 Gate F: Tracking and measurement
- [ ] Google Ads conversion actions: form submit, calls from ads, calls from the site, booked calls
- [ ] GA4 + Tag Manager on the landing page. Test conversions confirmed firing
- [ ] Call tracking (Google forwarding number) on
- [ ] Process for telling Google which leads became clients (offline conversion upload using gclid). Can be v2, but the gclid capture in Gate E must exist now
- [ ] 27ADS estimates entered as benchmarks in Analytics
- [ ] Pass/kill lines (§1) confirmed and recorded in Experiments
- [ ] Freedom number set (Goals)

### 6.8 Gate G: Pilot (an outreach client, $0 ad spend)
- [ ] Outreach target list (≥ 30 businesses that fit the offer)
- [ ] Outreach sequence + call script
- [ ] ⚙ First client signed through outreach
- [ ] ⚙ Full loop run once: sell → onboard → contractor delivers → Max approves → report → invoice → client pays → contractor paid
- [ ] Pilot retro written (Experiments); playbook and offer updated

### 6.9 Gate H: Google Ads build (27ADS §5 setup checklist)
- [ ] Keyword Planner: NZ cost per click checked for the niche (> $10 → reconsider Meta first)
- [ ] One standard **Search** campaign, ~$13/day
- [ ] **"Include Google Display Network" OFF**
- [ ] **"Include Google search partners" OFF**
- [ ] 2–3 ad groups by service theme
- [ ] Phrase and exact match only (no broad)
- [ ] Negative keywords loaded: free, cheap, DIY, template, course, jobs, salary, tutorial
- [ ] Location targeting set (local region to start)
- [ ] Bidding: Maximise Clicks with a max CPC cap
- [ ] Responsive search ads with a "from $X/month" headline
- [ ] Call + sitelink assets added
- [ ] Ad schedule matched to the hours Max can respond to leads
- [ ] Billing set up on the GH account; budget alert on
- [ ] Don't use Performance Max, Display, Demand Gen or YouTube

### 6.10 Gate I: Go-live
- [ ] ⚙ Every launch-critical item above done or N/A
- [ ] Lead-response blocks in Max's calendar for the first 2 weeks
- [ ] Monday weekly review scheduled (§8)
- [ ] Spend tracking ready (Analytics → manual monthly entry)
- [ ] Launch date recorded. Home switches to live mode

### 6.11 Post-launch milestones (they sit on the Roadmap too)
- [ ] **Week 1:** search terms report reviewed, negatives added, conversions confirmed firing
- [ ] **Weeks 2–4:** weekly optimisation; every change logged in Experiments
- [ ] **Month 1:** expect no clients (27ADS). Compare cost per lead with the benchmark
- [ ] **Month 2 checkpoint (~$800 spent):** ⚙ ≥ 4 leads (≥ 2 qualified) and landing page conversion ≥ 3%, or pause and fix the offer/page (§1.1)
- [ ] **15–30 conversions:** switch bidding to Maximise Conversions
- [ ] ⚙ First paid-ad client signed → engagement started
- [ ] **Month 3:** first client still active; Max's hours per client recorded
- [ ] **Scale gate:** ⚙ 2 clients paying + ⚙ margin ≥ floor + ⚙ Max hours ≤ pass line → raise budget $400 → $600 (then $800, $1,000+ at each repeat of this gate)

---

## 7. Tabs in detail

### 7.1 Services & Pricing

Max, 2026-10-17: *"pricing needs to be adjustable… a Services/Pricing tab where I can add or remove and edit. It'll always be 33% of what a contractor quotes."* Contractor quotes change a lot, so prices have to follow them.

**Two sections in one tab:**

**A. Services (the price list)**
- One row per service Incrementum sells. Add / edit / remove (soft delete → Archive).
- Each row links to a catalogue item (`service_items`, so names/ids match `/pricing` and Apexus) or is a new Incrementum-only service.
- Fields: billing (monthly / one-off / range), **contractor quote basis**, **markup %**, sell price (calculated), optional manual override, GST basis, competitor price notes, internal notes (e.g. the web dev page-count ranges).
- **Price formula:** `sell price = contractor quote × (1 + markup %)`. The markup defaults to **33%**, set globally and overridable per service.
- **Which contractor quote?** Choose per service: the main contractor's rate, the average of the bench, or **the highest quote on the bench (recommended)**. Using the highest means swapping in the backup contractor never pushes a client below your markup.
- **Optional floor (recommended, see the maths below):** "never sell below the catalogue price". Then `sell price = max(quote × 1.33, catalogue Current price)`. It's a toggle per service, so Max can run pure cost-plus where he wants.
- **When a contractor's rate changes:** the suggested sell price updates and shows "price change pending" for **new** sales. Existing engagements keep their **signed price** (the framework's annual-review / 30-days'-notice rule). If a contractor raise pushes a live engagement under the markup, it raises an alert and a Recommended next move ("review price at renewal" or "move to another bench contractor").
- **Price history:** every change logged (old → new, why, who).
- **Range/custom services** (web dev tiers): stored as page-count bands with a range each (single page $900–1,200, < 5 pages $1,800–2,500, < 10 pages $3,200–4,500, < 19 pages $5,500–7,500, 20+ custom from $8,500, from the catalogue's `price_text`). The contractor quote + markup are applied per job when quoting.
- **Complimentary items:** a "usually waived" flag (e.g. Tracking & Reporting Dashboard's $600 setup). Packages show the waived value as a closing incentive.
- **Catalogue link:** Incrementum prices are a **layer over** the main catalogue and don't overwrite it. Max-delivered clients and the main `/pricing` page keep their own prices. A "Publish to catalogue" action can push an Incrementum price into `service_items` if Max wants them the same. (Open question §13.)

**B. Packages (offers)**
- A package = several services + bundle discount (the framework's 8% / 12% / 15% recurring, 5% / 10% setup) + setup items + minimum term + notice + inclusions/exclusions + monthly deliverables + landing page URL + Apexus preset + status (draft / live / retired).
- Package price **recalculates automatically** from its services' current sell prices. The **profit per client $, margin % and markup %** are shown live, red under the §1.1 pass line.
- Every engagement starts from a package (or a single service). A retired package goes to Archive.

#### The 33% rule: what it means for the $10k target (honest maths)

A 33% markup on the quote means Max keeps **~25% of the price** (0.33 ÷ 1.33). Under pure cost-plus, **profit per client depends entirely on how much the contractor charges**:

| Contractor quote (Foundation: ads + web mgmt) | Sell price (×1.33) | Max's profit / client | Clients for $10k |
|---|---|---|---|
| $650 | $865 | $215 | **~47** |
| $1,000 | $1,330 | $330 | **~30** |
| $1,500 | $1,995 | $495 | **~20** |
| *Catalogue price instead:* $650 quote, sold at Foundation $1,426 | $1,426 | $776 | **~13** |
| *Catalogue Suggested:* $650 quote, sold at $1,932 | $1,932 | $1,282 | **~8** |

- **The catch with "find contractors who aren't too pricey":** under pure cost-plus, a cheaper contractor makes your **price** cheaper, which means **less profit for you**, not more. Cheap contractors only raise your profit if the sell price is anchored to the market or catalogue.
- 30–47 clients is above the 15–25 accounts 27ADS says one person can manage, so pure 33% cost-plus most likely **can't reach $10k** before an account manager is needed. That would be before the business can afford one.
- **Recommendation:** keep 33% as the **minimum markup** (the floor that guarantees every sale makes money), and **sell at the catalogue/market price whenever that's higher**. That's the floor toggle above. Cheap but good contractors then increase Max's profit, and $10k stays at ~8–13 clients.
- The tab supports whichever Max chooses. This is a pricing decision, not a build one (§13).

#### 7.1.1 Which services to put forward (reviewed 2026-10-17 against the live catalogue)

Source: the live `service_items` table (read-only query, 2026-10-17), which matches `ai-agents/Proposer/gh_pricing_framework_v5.md` apart from the differences noted in §10. Prices are NZD excl. GST, "Current" rates. **Contractor costs below are planning guesses**, to be replaced with real quotes in Gate C.

**Every recurring service in the catalogue, scored for Incrementum:**

| Service (id) | Price/mo | Contractor type | Contractor cost guess | Fit | Notes |
|---|---|---|---|---|---|
| Google Ads Mgmt (`ga-google-ads-mgmt`) | $950 (sugg. $1,400) | Ads specialist | $400–600 | ★★★ **Lead** | High search intent, matches your proof (12.86% CTR), results measurable monthly |
| Website Mgmt (`ga-website-mgmt`) | $600 (sugg. $700) | Web dev / designer | $150–300 | ★★★ **Lead** | Low effort, clients rarely cancel it, keeps clients longer |
| Meta Ads Mgmt (`ga-meta-ads-mgmt`) | $950 (sugg. $1,400) | Ads specialist (same person ideally) | $400–600 | ★★☆ Step-up | Best for B2C/ecommerce/local. Results depend on creative |
| Ad Creative Design (`ga-ad-creative-design`) | $650 (from scratch sugg. $1,500) | Designer | $250–400 | ★★☆ Step-up | Pairs with Meta. Designers are easy to find |
| Creative Content Architecture (`ga-creative-content-arch`) | $800 | Designer / content creator | $300–450 | ★★☆ Step-up | Pairs with Meta / organic |
| Tracking & Reporting Dashboard (`gs-tracking-dashboard`) | $300 | Ads specialist / analyst | $50–100 | ★★☆ Add-on | Mostly built once, cheap to keep running, makes reporting look professional |
| Organic Meta Mgmt (`ga-organic-meta-mgmt`) | $1,050 | Social media manager | $400–600 | ★☆☆ Later | Lots of contractors, but clients cancel more because the ROI is harder to show |
| Newsletter Infrastructure (`ga-newsletter-infra`) | $550 | Email marketer | $200–300 | ★☆☆ Later | Low search demand. Upsell only |
| Influencer Outreach (`ga-influencer-outreach`) | $500 | Niche | n/a | ✗ | Too niche for v1 |
| Review Collection / CRM Mgmt / Dedicated Accounts (P2) | $450–600 | n/a | n/a | ✗ | Existing-client-only by your own pricing rules |

**One-off work** (setup fees, entry projects, not retainers): Tracking & Data Infrastructure ($500–700), Landing Page Architecture ($900), web dev tiers ($900 – $8,500+), strategy items (GS: $350–750), AO reports ($350–450). Use them as **setup fees inside a package** and as **upsells**, not as the advertised offer.

**Systems & Software (SS)** is already contractor-delivered (Yuvi × 2–3, value-adjusted, so 50–67% margin). It's bespoke and needs your scoping time each job, so it's **Phase 3's second service**, with the AI/IT contractors Max wants to recruit taking on Yuvi-style builds.

**GrayScale (GX):** your own products, about 100% margin, and no contractor needed. **Attach to every Incrementum client** (20% retainer discount). It's the single biggest lever on profit per client.

**Recommended launch offer: the existing Foundation package, run through contractors**
- Google Ads Management + Website Management = **$1,426/mo** current (bundle 8%) / **$1,932/mo** suggested
- Setup: Tracking & Data Infrastructure ($500–700) + Landing Page ($900) as one-off fees. These cover the contractor's month-1 setup work.
- Contractors: **1 ads specialist** (main) + **1 backup**, **1 web dev/designer**. This is exactly the ads + web recruiting Max already wants to do.
- Step-up offer: the **Growth** package (+ Meta Ads + Newsletter, $2,684/mo current) for clients who suit Meta, delivered by the same ads specialist if they cover both platforms.
- Profit per client (guess): Foundation current ≈ $1,426 − ~$650 contractor ≈ **~$775** (~54% margin, matches 27ADS's $750). At suggested pricing ≈ **~$1,280**. Growth ≈ **~$1,400**. Plus a GrayScale product (~$150–300 after discount) ≈ almost all profit.
- **Path to $10k:** a mix of ~5 Foundation + ~2 Growth clients with GrayScale ≈ $10k. That's ~7–9 clients, not 13. Pricing and attached GrayScale matter as much as winning more clients.
- **Pricing (updated 2026-10-17):** Incrementum prices = contractor quote + markup (default 33%), set in Services & Pricing (§7.1). The profit figures above assume selling at catalogue prices. Under pure 33% cost-plus they're much lower; see the maths in §7.1.

**Fallback (unchanged):** if fewer than 2 good ads contractors are confirmed within ~4 weeks of sourcing, lead with **Website Mgmt + Landing Page / web dev** (website-first), then add Google Ads once an ads contractor is confirmed.

**Phase 3 second service candidates:** SS (AI/automation builds with AI/IT contractors) or the Meta + creative stack, depending on what Phase 1–2 data says sells.

### 7.2 Leads
- Inbox of leads from `/api/leads`, plus manual entry (calls, referrals, outreach). Each one stores source, UTM tags and gclid.
- A **response clock** runs from arrival to first contact. It's red past the target set in Gate E.
- Stages: New → Contacted → Qualified → Call booked → Proposal sent → Won / Lost (with reason).
- Book discovery call (Google Calendar, same mechanics as §7.4) and email (Gmail send + templates) from the lead.
- **Leads stay separate from the main GrayPortal CRM until they become clients** (Max, 2026-10-17). Same pattern as contractors: each lead has its own mini profile (business, contact, website, service interest, ad budget, source/UTM/gclid, notes, timeline), stored in Incrementum's own `incrementum_leads` table, not in `deals`.
- **"Onboard client" button** on a Won lead (mirrors "Onboard to GrayPortal" on contractors). It confirms, then in one transaction:
  1. creates the `companies` + `contacts` + `clients` records in the main GrayPortal software
  2. starts an engagement from the chosen offer (§7.3), adding the offer's services to `client_services`
  3. sends the existing client onboarding invite (`sendOnboardingInvite`)
  4. marks the lead Converted and links it to the new client (so Analytics can trace ad click → paying client)
- Trade-off: Incrementum leads don't show in the main Pipeline until they're onboarded. That's intentional; the main Pipeline stays for non-Incrementum sales.

### 7.3 Engagements
- An engagement = client + offer + assigned contractor(s) (main + backup) + price + contractor cost + slot weight + start date + minimum-term end.
- **Monthly cycle:** deliverables → contractor submits → **Max approves** → monthly report sent → client invoiced (in advance) → client paid → contractor payout due → paid.
- **Module toggles** per engagement (the `client_features` pattern): tasks, approvals, reporting, hours logging, payouts, credentials, client-portal visibility.
- First-90-days plan attached; health label (reuses GrayPortal's existing client health scores); months retained counter.
- Ending an engagement (churn or completion) moves it to Archive with a reason and lessons learned.

### 7.4 Contractors
- **Pipeline (kanban)** by stage: Sourced → Contacted → Meeting booked → Vetting → Confirmed → Onboarded. Off-ramps: Paused, Not a fit (with reason). Stages are an app-layer registry. Every move is recorded (who, when, note) for time-to-confirm analytics.
- **Bench (table)**: Confirmed/Onboarded only, grouped by service, with rate, capacity used and quality rating. The Gray Horizon Team strip sits on top.
- **Mini profile:**
  - identity (name, business, email, phone, location, portfolio links, source)
  - team card fields (photo, public title, bio)
  - **services & pricing per service**, linked to `service_items`: rate type (hourly / retainer / project), rate, capacity in client slots
  - skills tags
  - GST registered
  - payment terms
  - **agreements** (pay-when-paid accepted, non-solicit signed, notice period, each with a date + document)
  - quality rating 1–5
  - notes
  - activity timeline
- **Actions:**
  - **Advance stage**
  - **Book meeting:** a timed Google Calendar event with the contractor as attendee, `sendUpdates: "all"`, an optional Meet link. Logged; auto-moves Contacted → Meeting booked.
  - **Email:** Gmail send + contractor templates (outreach, follow-up, confirmed, welcome). Logged.
  - **Onboard to GrayPortal:** only at Confirmed with agreements recorded. Calls the existing `inviteContractorUser`, then sets Onboarded. **Blocked until the contractor-access item in Gate C is done.**

### 7.5 Capacity
- Unit = **client slots per service**. Contractors declare capacity per service. Engagements use slots (default 1, with an offer/engagement weight). Each service has planning defaults: average slots per contractor, **minimum bench 2**, buffer slots.
- Per service: confirmed contractors, slots total / used / free, utilisation, Bench OK label, plus the contractors-per-client ratio.
- **Forecast** from Goals' client targets:
  - contractors needed = ceil(target × avg weight ÷ avg slots), never below the minimum bench
  - gap = needed − confirmed
  - **recruit-by date** = target date − measured average Sourced→Confirmed time (default 21 days until measured)
  - Written out in plain words: *"SEO: 2 more contractors needed by 15 Feb. Start sourcing by 25 Jan."* Recruit-by dates go on the Roadmap.
- v2: measured hours per client replace declared slots.

### 7.6 Tasks
- **Main list** = `internalList = "project_incrementum"` with no sub-list. It shows in the Master Task View (gold column) and at the top of this tab.
- **Sub-lists** = named categories Max creates (e.g. Recruiting, Ads setup, Landing page, Contracts & legal). Shown as collapsible mini-lists, archivable. **Not shown on the master view.**
- Sub-list tasks **must still set** `internalList = "project_incrementum"`. Any task with no client/deal and no `internalList` falls into the **first** internal column ("Gray Horizon") in `MasterTaskView.tsx`. The Incrementum column filter becomes `internalList === "project_incrementum" && incrementumListId == null`.
- "Promote to main list" / "Move to sub-list" in the edit-task modal.
- Every task can have a due date, priority, assignee (Max or an onboarded contractor), and a link to a roadmap milestone or launch item.
- Defaults: overdue/due-today sub-list tasks **still appear** in GrayPortal Home's "Due" panel and in notifications. Sub-lists **don't** sync to Google Tasks.

### 7.7 Roadmap
- Own tables (`roadmap_items` requires a `clientId` and feeds the client portal): phases + milestones.
- Horizontal timeline, a "today" line, red overdue markers, phase progress = done milestones + linked tasks ÷ total.
- **The roadmap's phases are the growth phases in §1.2** (0 Foundations → 1 Prove → 2 Repeat → 3 Expand → 4 Delegate). Phases have *target* dates, but a phase only finishes when its exit criteria are met, never just because the date passed. A phase that runs past its target date shows as overdue, which is a prompt to look at why.
- Seed milestones: Phase 0 = Gates A–I (ads live Jan 2027); Phase 1 = month-2 checkpoint, first ads client, break-even; later phases get seeded when they're entered (§1.2).
- All deadlines (milestones, task due dates, launch items, recruit-by dates) go into one list. It feeds Home's Deadlines widget, GrayPortal Home's "Due" panel and GrayPortal calendar markers. Writing them to Google Calendar is optional (all-day events, like deals).

### 7.8 Playbooks
- Per service: onboarding steps, month-1 setup, monthly routine, QA checklist, report template. Versioned (date + what changed).
- Contractor welcome pack.
- Engagement templates link to their playbook. Contractors see the playbooks for their services in their own view (v2).
- Stored as GrayPortal documents (Storage) or as markdown in the DB. Decide at build time.
- **None exist yet** (confirmed 2026-10-17). That's normal at this stage. They get written during Phase 0:
  - The tab ships with an empty **playbook template** per service (sections: client onboarding, access setup, month-1 setup, monthly routine, QA checklist, report outline, handover notes).
  - First drafts can be generated from the pricing framework's deliverable definitions + 27ADS, then **the first confirmed contractor fills in how they actually do the work**, and Max reviews it.
  - The **pilot client (Gate G)** is where a playbook gets tested for real. The pilot retro updates it.
  - Gate D's "Service playbook" item stays launch-critical: a backup contractor can't take over an account without one.

### 7.9 Payouts
- Pay-when-paid ledger per engagement per month: client invoice (Xero) → paid? → contractor bill received → payout due (by the agreed number of days after the client pays) → paid (date, amount, GST).
- Flags: client overdue (contractor payout on hold), payout overdue (Max owes), contractor bill missing.
- **Xero gap:** GrayPortal's Xero link is a read-only invoice cache today. v1 = record contractor bills and payouts in Incrementum and match client payments from the cache. v2 = create invoices/bills in Xero.

### 7.10 Analytics
- **Funnel per month:** ad spend → clicks → leads → qualified → calls → won. Ad figures are entered by hand monthly (the Google Ads API isn't worth it at $400/month). Derived: cost per lead, cost per client, close rate, each **against the 27ADS benchmark**.
- **Runway:** spent vs $2k, months left, break-even progress.
- **Unit economics:** per engagement and average (margin $, %, markup %), MRR, monthly profit.
- **Retention:** active clients, average months retained, churn, lifetime value vs cost per client. The 27ADS growth model with real inputs.
- **Contractors:** recruiting conversion, time to confirm, utilisation, on-time rate, quality.
- **Max's time:** hours per client per month and **profit per hour of Max's time** (the real proof metric).
- **Incrementum P&L:** revenue − contractor costs − ad spend − tools/insurance, ring-fenced from the rest of Gray Horizon (matches the Xero tracking category from Gate B).
- Every chart is built with the dataviz skill, in the light palette (§3).

### 7.11 Goals
- Goal = metric + target + period. Most are tied to live data and track themselves: new clients, active clients, MRR, monthly profit, qualified leads, confirmed contractors per service, average margin %, ad spend (as a cap), Max's hours per client (as a cap). Manual milestone goals are allowed too.
- Progress, a pace line (where it should be by today), status (on track / at risk / missed / hit).
- **Seeds:**
  - the freedom number
  - 3–5 confirmed contractors with a backup
  - first outreach client before ads
  - month-2 checkpoint
  - break-even (1 client × 3 months)
- Client-count goals feed the Capacity forecast. Goals can share a milestone's deadline.
- **Each phase seeds its own goals** when it's entered (§1.2). The phase's exit criteria are goals with a `phaseId`, so Goals and Phase progress always show the same numbers.

### 7.12 Experiments
- **Change log:** every change to ads, offer, price, landing page or process, with date, what changed, why, the expected effect, and the result after N days.
- **Tests:** hypothesis + metric + pass/kill line + start/end + verdict. The §1 proof criteria live here.
- Pilot retro and monthly retros.
- Why this exists: at $400/month there's too little data for charts to say much. You learn from deliberate, logged changes.

### 7.13 Archive
- Read-only, filed by year → client: ended engagements (with reason and lessons), closed roadmap phases, retired offers, contractors who left, completed sub-lists. Searchable.

---

## 8. Accountability system

A dashboard you look at won't keep you accountable on its own. A habit you repeat will.

### 8.1 Weekly review (Mondays)
- A guided page generated from live data: last week's numbers vs goals, what's off pace, overdue items, leads that went unanswered, experiments due for a verdict.
- Max writes **3 actions for the week**. They become main-list tasks automatically.
- Each review is saved (date + notes + actions). The Weekly review widget shows "due" / "done", and a streak count.
- Prompt: a Monday morning notification (and optionally an all-day calendar event).

### 8.2 Freedom number
- A single figure Max sets: the monthly Incrementum profit that would replace his own income and change his life. It links to GrayPortal's Owner's Cut page (`/finance/personal`) so it's grounded in his real personal numbers.
- It's the top goal and the biggest widget on Home in live mode, and the figure the GrayPortal Home banner can show.
- Months-to-target at the current growth rate (the 27ADS growth model: active clients ≈ new per month × average stay).

### 8.3 Low friction
- Quick-add everywhere (task, lead, note, change-log entry).
- Fully usable on a phone (the Incrementum shell must be responsive from day one).

---

## 9. Data model sketch (not final)

Follow existing conventions: `softDelete` + `actorColumns`, app-layer registries instead of pgEnums where the list may change, migrations applied by hand in Neon.

- `contractors`: extend with stage, stageChangedAt, businessName, email, phone, location, portfolioUrl, source, gstRegistered, paymentTerms, qualityRating, notes, photoRef, publicTitle, bio, payWhenPaidAcceptedAt, nonSolicitSignedAt, noticePeriodDays.
- `contractor_services`: contractorId, serviceItemId → `service_items`, rateType, rate, capacitySlots, notes.
- `contractor_stage_events`: contractorId, fromStage, toStage, note, actor, at.
- `activities`: + nullable `contractorId`, `googleEventId`.
- `documents`: + nullable `contractorId` (signed agreements).
- `incrementum_services`: serviceItemId (nullable for Incrementum-only), name, billing (monthly / one_off / range), quoteBasis (main / average / highest), markupPct (null = global default), catalogueFloor (bool), manualPrice (nullable override), usuallyWaived (bool), gstBasis, ranges (jsonb, for page-count bands), competitorNotes, notes, status.
- `incrementum_price_history`: serviceId, oldPrice, newPrice, reason, actor, at.
- `incrementum_settings`: defaultMarkupPct (33), plus other global defaults.
- `incrementum_packages` + `incrementum_package_services`: name, inclusions, exclusions, deliverables, setup items, bundle discount rule, minTermMonths, noticeDays, landingUrl, apexusPreset, status. Price is calculated live, never stored. The **signed price is stored on the engagement**.
- `incrementum_leads`: businessName, contactName, email, phone, website, serviceInterest, adBudget, stage, source, utm (jsonb), gclid, firstResponseAt, lostReason, notes, convertedClientId (set by "Onboard client", §7.2). `activities` also gets a nullable `leadId`.
- `incrementum_next_moves`: ruleKey, payload, raisedAt, dismissedAt, dismissNote (the Recommended next move alerts, §1.2).
- `engagements`: clientId, offerId, price, startDate, minTermEnd, status, endedAt, endReason, modules (jsonb toggles).
- `engagement_contractors`: engagementId, contractorId, serviceItemId, role (main/backup), slotWeight, monthlyCost.
- `engagement_cycles`: engagementId, month, deliverablesStatus, approvedAt, reportSentAt, xeroInvoiceId, clientPaidAt, contractorBillRef, payoutDueAt, payoutPaidAt, payoutAmount, payoutGst.
- `incrementum_launch_items`: gate, title, status, owner, dueDate, notes, evidenceUrl, critical, autoKey (null = manual), naReason, sortOrder.
- `incrementum_task_lists` + `tasks.incrementumListId` + `tasks.incrementumMilestoneId` + `tasks.launchItemId` (all nullable).
- `incrementum_phases`: number, name, targetDate, enteredAt, exitedAt, adBudget, clientRangeMin/Max, status (upcoming / active / hold / done), retroExperimentId. These are the growth phases (§1.2) and also the roadmap phases.
- `incrementum_phase_criteria`: phaseId, metricKey (null = manual), comparator, target, holdWeeks, manualDoneAt, sortOrder. Edits are logged through `audit_log`.
- `incrementum_milestones`: phaseId, title, dueDate, doneAt.
- `incrementum_goals`: metricKey, target, periodStart, periodEnd, manualDone, milestoneId, phaseId, sortOrder, isFreedomNumber.
- `incrementum_service_settings`: serviceItemId, defaultSlotsPerContractor, defaultEngagementWeight, minBench, bufferSlots.
- `incrementum_ad_months`: month, spend, clicks, impressions, leads (manual).
- `incrementum_experiments`: type (change/test/retro), title, hypothesis, metricKey, passLine, killLine, startedAt, endsAt, result, verdict.
- `incrementum_playbooks` (+ versions).
- `incrementum_weekly_reviews`: weekOf, notes, actions (task ids), completedAt.
- `incrementum_home_layout`: userId, widgets (ordered keys + visibility), mode override.
- `incrementum_hours`: engagementId, userId (Max or contractor), date, hours, note (Max's own hours from day one).

---

## 10. What already exists, and the gaps

**Reuse:**
- `contractors` + contractor role + `inviteContractorUser` (`dal/users.ts`)
- `tasks` (`assignedTo`, `internalList`, Google Tasks sync)
- `service_items` / `/pricing` / Apexus
- `client_services`, `client_features` (toggle pattern)
- `recurring_templates`
- `xero_invoices` (paid status)
- Gmail send + email templates
- Google Calendar event insert (`google/adapter.ts`, `calendar.events` scope already granted)
- `/api/leads`
- client onboarding wizard
- health scores
- Vault
- referrals
- Owner's Cut
- `SessionBootOverlay`
- `gh-grid-joined` layout

**Gaps, in order of how much they block:**
1. **Contractor access: FIXED (031 applied 2026-10-18).** Contractors now only reach their own `/work` workspace; `tests/security/contractorScoping.test.ts` proves a contractor session sees 0 clients, companies, contacts, prices, emails and contractors. Original audit, kept for the record — done 2026-10-18 (the findings are also shown on Contractors → Bench → Contractor access):
   - **At RLS, the `contractor` role has `FOR ALL` (read *and* write) on:** companies, contacts, activities, clients, tasks, documents, referrals, client_features, client_services (every client's prices), client_metrics_snapshots, client_team_members, client_health_*, client_activity_feed, service_items/service_modules (the pricing catalogue), notifications, client_health_scores, recurring_templates, emails and email_templates (every cached email), contractors, ideation/roadmap/meeting summaries/tool stack (per-client rows). Sources: db/sql/001, 004, 007, 008, 009, 010, 012, 013, 014, 015, 016, 022.
   - **In the app,** a contractor's sidebar shows Home, Clients, Tasks and Pricing.
   - **Not reachable:** deals, Vault/credentials, Xero, finance, Google connection, campaigns, Incrementum (all admin-only). The MCP endpoint is admin-only.
   - **Why it matters for this model:** an onboarded contractor could list every client and what they pay, and read the catalogue (so work out the markup). That's the "client and contractor deal directly" risk from 27ADS, handed over on a plate.
   - **Fix as built (Max approved 2026-10-18, applied the same day):** a new `db/sql/031_contractor_scoping.sql` that narrows each `IN ('admin','contractor')` policy to `admin` only, except `tasks` (contractor sees rows where `assigned_to = app.user_id`) and a future contractor view of their own engagements/payouts; in `(app)/layout.tsx`, drop Clients and Pricing from the contractor nav; then build a small `/work` contractor view (assigned tasks, their engagements' deliverables, their payouts, their playbooks). Check what Yuvi (the existing contractor login) relies on before tightening.
   - **Gate:** "Onboard to GrayPortal" (and "Link existing login") only work once 031 is detected (the `contractor_me` view exists). Now that it's applied, onboarding is unlocked. The Launch item "Contractor access is safe" ticks itself.
2. **Xero is read-only.** Payouts v1 records in Incrementum. Creating invoices/bills in Xero is v2.
3. **Calendar events are all-day only today.** Timed events with attendees and Meet links are new code, but no new OAuth scope is needed.
4. **Inbound email matching** only covers `contacts`, so contractor replies won't auto-match (v2).
5. **The light palette is portal-scoped.** It needs promoting to `tokens.css` (§3.1).
6. **The gray-portal MCP connection returns 401** (token needs refreshing). Fix it before relying on MCP tools for Incrementum.
7. **Catalogue drift** (found 2026-10-17, live `service_items` vs `gh_pricing_framework_v5.md`). Not fixed, just parked here:
   - `gs-tracking-infra` setup is **$700** live. **Max confirmed $500** (2026-10-17). Change it on `/pricing` (an audited edit; don't use a raw SQL update).
   - `gs-tracking-dashboard` **$600 setup** live is correct. Max: *"usually complimentary"*. The framework's "monthly-only" note was wrong and has been corrected in `gh_pricing_framework_v5.md`.
   - Web dev tiers: **not actually missing.** Prices live in `price_text` as page-count ranges, so nothing to fix.

---

## 11. Security and MCP risk tiers

- All Incrementum routes are admin-only. Contractors only ever see their own engagements/tasks/payouts/playbooks through the contractor view (v2), enforced in the DAL/RLS, not just hidden in the UI.
- Contractor profiles hold personal data (phone, rates, agreements). Admin-only, audited like other CRM data.
- MCP tiers (Open-Work-Brief §0 rule 4):
  - **Always confirm:** onboard contractor to GrayPortal (creates a login + emails them)
  - **Confirm:** send email, book meeting, mark payout paid, change an offer's price
  - **Low:** stage changes, notes, tasks, launch-item status, goals, roadmap, experiments

---

## 12. Build order (original; everything below is now built, see §14)

The rule: **build only what the Launch checklist needs before January.** Everything else waits until it's needed.

1. **Shell + brand + Phases + Launch + Tasks + Home (pre-launch mode).** Light tokens, entry animation, sidebar entry, GrayPortal Home banner, master task column, growth phases with Phase 0 active, Launch checklist (seeded), Tasks with sub-lists, Home with the Phase progress / Launch readiness / Needs attention / Main task list / Deadlines widgets.
2. **Contractors** (pipeline, profiles, meetings, email) + **Services & Pricing** (price list, packages, profit check). Contractor rates feed prices directly, so build these two together. This is the recruiting tool for Gate C and the pricing tool for Gate A.
3. **Goals** (freedom number, seeds) + **Roadmap** + **Weekly review** + **Experiments**.
4. **Leads** (response clock, gclid/UTM capture). Needed before the landing page goes live.
5. **Contractor access** (contractor view or audit), then the **Onboard** button + **Gray Horizon Team** widget.
6. **Engagements + Payouts + Playbooks + hours.** Needed by the first pilot client, so this moves up if a pilot client signs early.
7. **Capacity** (declared slots) + **Analytics**, once there's a month of real data.
8. v2: Home drag-and-drop customising, Xero write-back, inbound contractor email matching, measured capacity, offline conversion upload.

---

## 13. Open questions

1. ~~Freedom number~~ **Answered 2026-10-17: $10k/month profit** (Max currently earns ~$3k/month from the business). *Still to confirm:* $10k total business profit (Incrementum adds ~$7k) or $10k from Incrementum alone? At the 27ADS ~$750 profit per client, that's ~10 or ~14 active clients, which puts the freedom number inside **Phase 3**. Phase 2 → 3 profit threshold = 50% of it ($5k).
2. Launch service: **direction 2026-10-17:** depends on which contractors Max can find. He's recruiting for paid ads (Google + Meta), website design, and AI/IT (software/automation). Recommendation: **paid ads management (Google + Meta) first**, landing pages/websites as a one-off add-on, website care as a small retainer add-on, and AI/automation as the Phase 3 second service. Fallback rule: if fewer than 2 good ads contractors are confirmed within ~4 weeks of sourcing, lead with web design + care plan instead.
3. ~~Leads~~ **Answered:** a separate `incrementum_leads` table, with an "Onboard client" button that creates the client in the main software (§7.2).
4. ~~Playbooks~~ **Answered:** none exist yet. Templates + drafts in Phase 0, filled in by contractors, tested on the pilot (§7.8). Storage format is still a build-time decision.
5. ~~Entry animation~~ **Answered:** keep 1850ms.
6. ~~Sub-list Google sync~~ **Answered:** no.
7. ~~Team visible to clients~~ **Answered:** no by default, switch on per engagement if needed.
8. ~~Pass/kill lines~~ **Answered:** agreed, except the month-2 checkpoint, revised to ≥ 4 leads (≥ 2 qualified) + ≥ 3% landing conversion (§1.1). Max to confirm the revision.
9. ~~Phase ranges~~ **Answered:** agreed.
10. ~~Phase 4 trigger~~ **Answered:** profit-based, shown as a "Recommended next move" alert, not a gate (§1.2).
11. ~~Current vs Suggested~~ **Superseded:** pricing is now contractor quote + markup (§7.1). Still open: **pure 33% cost-plus, or 33% as a floor with the catalogue price as the minimum sell price?** (Recommendation: floor. See the maths in §7.1.)
12. ~~Launch offer~~ **Answered:** Foundation (Google Ads + Website Mgmt) confirmed, Growth as the step-up.
13. ~~Catalogue drift~~ **Answered:** tracking infra $500 (Max to update on `/pricing`), dashboard $600 setup usually complimentary, web dev by page count (already correct).
14. **New:** Incrementum prices as a layer over the main catalogue (recommended), or should they replace catalogue prices?
15. **New:** NZ search volume for the Foundation keywords. Check in Keyword Planner (Gate H) before the landing page copy is final.


---

## 14. Build status (2026-10-18)

Built on git branch `incrementum` (not merged, not deployed). Type-check, lint, unit tests (`tests/lib/incrementum*.test.ts`, 33 tests) and `next build` all pass. **Not yet exercised against a real database or in a logged-in browser:** the tables don't exist until the migration is applied, and this session couldn't sign in.

### 14.1 Deploy status
1. **Database: done.** Max ran **`db/APPLY-incrementum-2026-10-18.sql`** in Neon on 2026-10-18 (the three files below in order; dry-run verified first). Verified afterwards: 27 tables with RLS on, 8 `contractor_*` views, 5 functions, `tasks.incrementum_list_id`, the `incrementum_lead` notification type, 28 foreign keys. Only `tasks` and `notifications` policies still mention contractors (intended). Security suite: 23 pass, including the contractor lockdown test.
   - `db/migrations/0037_incrementum.sql`, `db/sql/030_incrementum.sql`, `db/sql/031_contractor_scoping.sql`
   - Neon printed "Identifier … will be truncated" for 7 long foreign-key names. Harmless: Postgres caps names at 63 characters, the constraints exist and enforce, and the truncated names are unique. Future `drizzle-kit generate` runs work from the repo snapshot, so they're unaffected.
2. **App code: next.** Deploy the `incrementum` branch (merge to `main`). The live `main` code is unaffected by the new column and stricter rules in the meantime.
3. First visit to `/incrementum` seeds everything in one transaction.

### 14.2 What's built
- **Shell & brand:** `/incrementum` light space inside the dark app; shared `--gh-lt-*` tokens (the portal's light theme now reads them too); gold sidebar entry under Home; light "Enter Project Incrementum" banner far right of Home's welcome row (admin only); "Entering Project Incrementum" light entry animation sharing one `BootOverlayView` with the session boot; light loading state; admin-only error screen that also explains a missing migration.
- **Master Task View:** "Project Incrementum" column third, gold outline, links to the Tasks tab; sub-list tasks hidden there and never synced to Google Tasks.
- **Tabs:** Home (19 widgets, pre-launch/live modes, per-user Customise saved in the DB), Launch (all gates, auto-ticking ⚙ items, N/A with reason, make-task), Goals (freedom number tiers, pace), Roadmap (phases 0–4 with exit criteria, milestones, gated Advance with retro, all deadlines), Tasks (main list + sub-lists, promote/move), Weekly review (3 actions → main-list tasks due Friday, streak), Services & Pricing (quote + markup, quote basis, catalogue floor toggle, manual override, usually-waived, page-count ranges, price history, packages with bundle discounts and live profit/clients-to-freedom), Leads (inbox + response clock, kanban, profile, email/meeting/notes, Onboard client → company/client/login/starter tasks + engagement at the package price), Engagements (signed prices, team, monthly cycle ledger, modules, hours, notes, end → archive), Contractors (pipeline kanban, bench, Gray Horizon Team, profile with services/rates/capacity/agreements/team card, email/meeting/notes, gated Onboard), Capacity (slots per service, contractors-per-client, recruit-by forecast), Playbooks (templates + markdown editor with preview, versioned), Payouts (pay-when-paid enforced), Analytics (monthly ad entry + charts + table, real vs 27ADS, runway, economics, retention, contractors, leads), Experiments (change log, tests with pass/kill, verdicts), Archive (by year, searchable), Settings (markup, freedom tiers, budget, response target, launch date, capacity assumptions, general hours).
- **Integrations:** Gmail send (shares the 30/hour cap), Google Calendar timed meetings with attendee invite + optional Meet link (`createMeetingEvent`), public intake `POST /api/incrementum/leads` (honeypot, optional `x-lead-capture-key`, 5/10 min/IP, gclid + utm_* captured, in-app + email alert to admins, acknowledgement only if the `incrementum_lead_acknowledgement` template exists).
- **MCP:** `incrementum_overview`, `incrementum_list_leads`, `incrementum_list_contractors` (read); `incrementum_create_lead`, `incrementum_create_task`, `incrementum_log_experiment`, `incrementum_log_hours` (write, always prompt). Login-creating, email/meeting, payout and price actions are deliberately UI-only.
- `/contractors` now redirects to `/incrementum/contractors` (old `/contractors/[id]` pages still work; existing contractors can be "brought in").

### 14.2b Added 2026-10-18 (second pass)
- **Contractor section (§10 gap 1, fixed in code):** 031 removes contractor access from every commercial table; contractors get their own workspace at **`/work`** (Overview, My clients + per-client months/tasks/hours/playbooks, Tasks, Payouts, Playbooks, Gray Horizon Team, Profile) reading only the `contractor_*` views. They can mark a month delivered, add their invoice number, log hours, tick their tasks and edit their team card. Proxy + admin layout send contractor logins to `/work`. Onboarding (and linking an existing login such as Yuvi's) unlocks automatically once 031 is detected, and the Launch item "Contractor access is safe" ticks itself.
- **Quote builder ("What they're after"):** on each lead and engagement. Add needs (service + detail + tags + quantity) → **Assign** popup lists every contractor who can fulfil it (quoted the service, or skills match the tags) with rate, free capacity, quality and est. sell price → assigning snapshots the rate → est. price = rate × (1 + markup), with per-line rate / markup / price overrides. Onboard client defaults the signed price to the quote total and turns assignments into the engagement team. Services have tags; packages have optional hand-set prices.
- **Launch-relative dates:** Phase 0–3 targets, "Google Search ads live", the month-2 checkpoint, break-even and related goals count from Settings → "Ads go live" and show TBD until it's set (ads go live in January; date not fixed).
- **Google Tasks:** the first Incrementum main-list task auto-creates and links a "Project Incrementum" Google Tasks list if none is linked.
- **Catalogue:** Tracking & Data Infrastructure setup set to $500 in the live catalogue (audited as an agent edit).

### 14.3 Not built / deliberately held
- Per-contractor payout split when two contractors share one engagement-month (v1 tracks one payout per month; each contractor sees their own monthly rate).
- Lead forms / landing page: later, with the ads build (Max, 2026-10-18).
- Xero write-back (invoices/bills); offline conversion upload; inbound email matching to contractors/leads; drag-and-drop Home ordering (v1 is a comma list); measured-hours capacity (v2).
- "Held for 4 weeks" / "2 consecutive months" phase criteria are checked on the current value only. The label says so; Max confirms by eye.

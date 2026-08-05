# Gray Horizon Ops Dashboard — Build Brief: Phase 2 (Client Portals)

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** Client-facing portal only. Do not build Google Calendar/Tasks sync, the MCP server, or the Today view — those remain later phases (see §8).

---

## 0. Read this first

Phase 1 (`docs/Dashboard-Brief.md`) built the internal CRM and, ahead of schedule, laid groundwork for this phase: the `clients` table, `referrals`, `client_features`, and client-scoped `client_id` columns on `tasks` and `documents` — all already exist, with row-level security already enforcing isolation on every one of them (`db/sql/001_roles_and_rls.sql`). What's missing is the client-facing half: no client has ever actually logged in. The `client` role exists in the type system (`src/lib/dal/session.ts`) and in RLS policy but the entire login/session path currently hard-rejects anyone who isn't on the admin allowlist.

This phase is the first time code you write will be used by someone outside Gray Horizon. Treat that as the headline constraint, not a footnote.

Three rules that override everything else in this brief, same spirit as Phase 0/1's:

1. **A security review and a real penetration test are required gates before any client gets a live login.** This was called out explicitly in the Phase 0/1 brief's forward-compatibility section and it was not a placeholder — do not skip it because Phase 1's security work was thorough. Client-facing surface is a different threat model (adversarial users, not just careless ones) and needs to be evaluated as such.
2. **Business logic stays in the application layer**, same as Phase 1 — the future MCP phase depends on it.
3. **Stop at the end of this phase and wait.** Do not scaffold Google Calendar sync, MCP tools, or the Today view.

---

## 1. What this is

A logged-in area where a Gray Horizon client can see their own tasks, documents, referral status, and next payment date — nothing belonging to any other client, and nothing from the internal CRM (deal values, pipeline stage, internal notes). Read-heavy: the only client-initiated write in scope is submitting a new referral.

**Not in scope:** client-side invoicing or payment collection (still no ERP), messaging/chat with Gray Horizon, editing their own company/contact records, seeing deal economics or pipeline stage, contractor-role portal access (schema supports it, no UI needed yet).

## 2. What already exists (verify, don't rebuild)

- `clients` table with `next_payment_date`, linked to `companies` — admin-side CRUD already built (`src/app/(app)/clients/`).
- `referrals` table + admin-side status management (`ReferralStatusSelect.tsx`).
- `client_features` table — per-client feature toggles, already has an admin UI (`FeatureToggle.tsx`). The portal's job is to **read** this table and conditionally render sections; the registry of valid `featureKey` values needs to be defined once, referenced by both the admin toggle UI and the portal (currently only implied, not centralized — fix this in Phase 2, brief §5).
- `users.role` includes `"client"`, `users.clientId` links a client user to their `clients` row.
- RLS policies (`tasks_scoped`, `documents_scoped`, `referrals_scoped`, `client_features_scoped`, `clients_internal_or_own`) already exist and already restrict client-role database sessions to their own `client_id` — **these have never been exercised by a real client session and must be tested against, not assumed correct.**
- `tasks.googleTaskId` / `syncState` columns exist for the later Calendar/Tasks phase — ignore them, don't build against them yet.

## 3. Authentication for clients

- Same Firebase Auth Google-provider mechanism as admin — no new auth system.
- The allowlist gate (`src/lib/dal/allowlist.ts` / `claimOrVerifyAllowlist`) currently only recognizes admin emails. Extend it to recognize client emails and set `role: "client"` + the correct `clientId` on claim — propose the exact claiming mechanism before writing code (e.g., an admin explicitly invites a client email against a specific `client_id` row, vs. a client self-registering — self-registration is very likely wrong here given tenant isolation stakes, but confirm).
- Deny-by-default routing (`proxy.ts` + DAL-level checks) must extend cleanly: client routes live under a distinct path prefix (e.g. `/portal/*`) so the existing admin route-locking default doesn't need to special-case anything — a client session must never be able to reach an admin route, and vice versa. Decide and state explicitly how the two are distinguished at the routing layer, not just the DAL layer — defense in depth, matching how admin auth is checked independently in both `proxy.ts` and the DAL today.
- Session duration: reuse `SESSION_MAX_AGE_MS` as it exists after the Phase 1 fix (14-day Firebase cap). The brief's original 30-day target still has no refresh mechanism — if that matters more for client sessions than it did for solo-admin use, this is the moment to build the silent-refresh flow, not defer it again.

## 4. Screens

- **Portal home** — client's next payment date, open tasks, and any enabled-feature sections, composed per `client_features`.
- **Tasks** — read-only list of the client's tasks (status, due date). No task creation/editing by clients in this phase.
- **Documents** — list + download of documents scoped to the client (`documents.clientId`). Confirm Firebase Storage access rules actually enforce this at the storage layer, not just via the DB query returning the right rows — a signed URL or storage rule gap here is a direct tenant-isolation leak independent of Postgres RLS.
- **Referrals** — view existing referral submissions and status; submit a new one (`referredName`, optional `referredCompanyId` if it already exists as a company, notes). This is the one client-writable flow in scope — validate and audit-log it like any other mutation (brief §5.4/§5.8 from Phase 0/1 still apply in full).
- **Feature-gated sections** — anything else exposed via `client_features.featureKey` (e.g. a `grayscale_page` referenced in the schema comment) — confirm with Max what the actual registry of feature keys should be before building the rendering logic; don't invent features speculatively.

## 5. Application-layer work

- Centralize the `featureKey` registry (a fixed list + types, not a DB enum per the existing schema comment) — single source of truth referenced by the admin toggle UI, the portal's conditional rendering, and any validation on write.
- Extend the DAL's isolation-escape-hatch pattern from Phase 1 (§5.3 of the original brief) to client-role callers explicitly — a client-role query with no `client_id` scope must fail the same way an unscoped admin-wide query requires the audited escape hatch, not silently return nothing or, worse, everything.
- New security tests, run in CI alongside the existing 11 (brief §5.8 pattern): a client cannot read another client's tasks/documents/referrals; a client cannot reach any internal CRM table or route; a client cannot see another client's `client_features` rows; referral submission by a client is correctly audit-logged with the client's identity, not a spoofed one.

## 6. Design

Same token system, same brand rules as Phase 1 (`docs/Dashboard-Brief.md` §4) — no new tokens, no new fonts. The portal is a lighter-weight, more restrained surface than the CRM: fewer actions, more whitespace, still dark-first monochrome with the same squared geometry and uppercase micro-labels. It should read as unmistakably Gray Horizon to a client who's only ever seen the marketing site — lean toward that register more than the dense-CRM register Phase 1 tuned for internal daily use.

## 7. Working method

Same as Phase 1 (brief §8): propose before building, small reviewable commits, PR descriptions must explain security properties for anything touching auth/DAL/`client_id`/audit log — this phase touches all four in almost every change, so expect most PRs to need that explanation. Flag anything in this brief that seems wrong or costly rather than quietly working around it.

**Before writing the client-facing login path**, propose the exact allowlist-extension and route-separation design from §3 and wait for sign-off — this is the one place in Phase 2 where a design mistake directly becomes a cross-client data leak, and it's cheaper to catch on paper.

**Before any client is given a real, working login**, stop and get explicit confirmation that the §0 security review / pen test gate has actually happened — do not let "the code is done" quietly become "clients have access."

## 8. Forward compatibility — still design for, still do not build

Unchanged from the original brief §9: Google Calendar/Tasks sync, the MCP server, and the Today view remain out of scope. Nothing in this phase should make those harder later, but nothing in this phase should start them either.

## 9. Open items for the owner

1. Client-claiming mechanism (§3) — admin-invites-client vs. self-registration vs. something else.
2. Route separation approach for `/portal/*` vs admin routes (§3).
3. The real `featureKey` registry — what sections actually exist beyond referrals/tasks/documents (§4, §5).
4. Whether 30-day sessions with refresh matter enough for clients to build now (§3).
5. Who performs the security review / pen test in §0, and roughly when, since it gates go-live.

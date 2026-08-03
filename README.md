# Gray Portal

Internal operations dashboard for Gray Horizon (Phase 0 + Phase 1, per `gh-dashboard-build-brief-phase-0-1.md`, plus the client-portal groundwork agreed in chat — see "Scope" below).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript), Node runtime throughout (including `proxy.ts` — Next 16 defaults Proxy/Middleware to Node, not Edge)
- **Database:** Neon Postgres (Sydney region), Drizzle ORM + drizzle-kit migrations
- **Auth:** Firebase Auth (Google provider only), session cookies (30 days), server-side email allowlist
- **Isolation:** Postgres Row-Level Security is the actual enforcement; the DAL (`src/lib/dal`) is the ergonomic layer on top
- **Hosting:** Firebase App Hosting (Cloud Run–backed)
- **Styling:** Plain CSS + design tokens (`src/app/tokens.css`), no UI framework

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values (ask Max for the Neon connection strings and Firebase Admin service account, or see "Provisioning" below if setting up fresh).
3. `npm run db:migrate` — applies Drizzle migrations, then RLS policies + role/privilege lockdown (`db/sql/`). Safe to re-run against a fresh database; re-running after the runtime role already exists will error on `CREATE ROLE` — apply individual new `db/sql/*.sql` files directly instead.
4. `npm run db:seed` — seeds the three allowlisted users (Max, Gray Horizon Admin, Yuvi) and a realistic sample pipeline.
5. `npm run dev`

## Architecture notes worth knowing before touching auth or the DAL

- **`src/proxy.ts`** is the network-boundary check: every route except `/login` requires a valid Firebase session cookie, or it redirects. It does NOT check the allowlist or role — that needs Postgres, and happens in the DAL.
- **`src/lib/dal/session.ts`** (`withSession`) resolves a verified Firebase UID to an internal `users` row inside a single Postgres transaction, and binds `app.role` / `app.user_id` / `app.client_id` as session variables for that transaction via `set_config(..., true)`. Every query issued through that transaction is filtered by the RLS policies in `db/sql/001_roles_and_rls.sql` — this is the real tenant-isolation guarantee, not a convention.
- **`withAdminScope(reason, fn)`** is the one escape hatch for admin-wide access with no real caller (cron jobs, seed scripts). Grep for it in review — every use should be a deliberate, visible decision.
- **Tenant model:** `clients` is a separate table from `companies` — a company becomes a client only via a deliberate act, not implicitly. Internal CRM tables (`companies`, `contacts`, `deals`, `activities`) carry no `client_id` at all. Only tables meant to be client-portal-visible (`tasks`, `documents`, `referrals`, `client_features`) carry a real `client_id`. See the schema comments in `src/lib/db/schema.ts` for why — an earlier draft got this wrong by keying isolation off `company_id`, which would have leaked deal economics to a client the moment they got portal access.
- **Audit log is append-only at the database level**, not just by convention: the runtime `grayportal_app` Postgres role has `SELECT, INSERT` on `audit_log` only — `UPDATE`/`DELETE`/`TRUNCATE` are explicitly revoked (`db/sql/002_audit_lockdown.sql`). Writing a row happens automatically inside `src/lib/dal/mutate.ts`'s `auditedInsert`/`auditedUpdate`/`auditedSoftDelete` — entity DAL modules use these instead of raw `tx.insert`/`tx.update`, so it's structurally impossible to mutate data without an audit row in the same transaction.
- **No hard deletes anywhere:** the runtime role has no `DELETE` grant on any business table, enforced at the database, not just by app code discipline.
- **Known RLS gotcha (found by the test suite, fixed in `db/sql/004`):** casting an unset/empty session variable straight to `::uuid` throws instead of behaving like "no match," because Postgres does not reliably short-circuit past it. Every policy that compares an ID column to a session variable wraps it in `nullif(current_setting(...), '')::uuid`. If you add a new client-scoped table, copy that pattern.

## Security tests

`npm run test` runs `tests/security/*.test.ts` against the real Neon database (connects directly to test RLS policies, since the enforcement is at the database level and testing it any other way would test the DAL's ergonomics, not the actual guarantee). Covers every requirement in brief §5.8. CI runs these on every push/PR — a failing test blocks the build step.

## Deploy model

- **Prod:** Firebase App Hosting watches the `main` branch directly via its own GitHub Developer Connect integration — pushing to `main` (after CI passes) triggers a Cloud Build → Cloud Run rollout automatically. There is no separate "deploy" GitHub Action for prod.
- **PR previews:** `.github/workflows/pr-preview.yml` scripts a dedicated App Hosting backend per PR (App Hosting's native preview model is a single shared preview branch, not per-PR — a deliberate tradeoff discussed with Max). **This workflow is unvalidated** — it was written before the GitHub↔App Hosting connection existed (that step needs an interactive OAuth authorization) and needs a real PR to confirm the `apphosting:backends:create` flags/API surface are right.
- **"Failing test blocks deploy":** enforced via required GitHub branch protection status checks on `main` (the CI workflow), not via App Hosting's own build step. **This branch protection rule needs to be configured manually** in GitHub repo settings (Settings → Branches → Branch protection rules → require the CI workflow to pass before merging) — it wasn't possible to script without `gh` CLI / a PAT.
- **Rollback:** App Hosting backends are Cloud Run services under the hood. Rollback = `gcloud run services update-traffic <service> --to-revisions=<previous-revision>=100`, or via the Cloud Run console. Not yet a one-click script — worth wrapping once the backend exists and a real rollback has been rehearsed once.

## Provisioning already done (this session)

- Firebase project: `grayhorizon-grayportal`
- Firebase Web app registered, config in `.env.local` / `apphosting.yaml`
- Neon Postgres project (Sydney), migrations + RLS + audit lockdown applied
- Seed data loaded

## Still needs a human

1. **Enable Google sign-in provider** — Firebase Console → Authentication → Sign-in method → Google → Enable. No reliable headless/CLI path for this step.
2. **Firebase Admin service account** for local dev and for App Hosting's runtime secrets — Firebase Console → Project Settings → Service Accounts → Generate new private key. Feed `FIREBASE_ADMIN_PROJECT_ID` / `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY` into `.env.local` locally and `firebase apphosting:secrets:set` for prod. (When actually deployed on App Hosting itself, the attached Cloud Run service account provides ambient credentials automatically — the explicit service account is only needed for local dev and possibly CI.)
3. **Create the App Hosting backend and connect it to `GrayHorizon-Admin/GrayPortal`** — needs an interactive GitHub OAuth authorization in a browser (Firebase Console → App Hosting → Create backend, or `firebase init apphosting`). Once connected, Firebase will hand over the DNS records for `app.grayhorizon.nz`.
4. **DNS** — once the backend exists, add the records Firebase provides in Cloudflare, in DNS-only (grey cloud) mode during initial certificate verification.
5. **Branch protection on `main`** requiring the CI workflow (see above).
6. **GitHub Actions secrets** — `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`, `FIREBASE_SERVICE_ACCOUNT` (a GCP service account JSON with App Hosting admin permissions, for the PR-preview workflow).
7. **Backup + restore test** (brief §5.7) — Neon has point-in-time restore built in; a restore has not yet been rehearsed. Do this before calling Phase 0 complete.

## Scope

This build folds in the CRM core from the original brief (Phase 0 + Phase 1) plus the client-portal groundwork Max asked for mid-build: a `clients` table distinct from `companies`, client-visible `tasks`/`documents`/`referrals`, and a `client_features` toggle table for the planned dynamic portal builder. None of the client-facing UI (portal screens, referral dashboard, Grayscale gating, dynamic feature toggling) is built yet — the schema exists so it doesn't require a migration later, per the same "design for, don't build" principle the original brief used for Phase 2+.

**Known gaps in the current CRM screens** (functional but not exhaustive): no standalone deal list view (pipeline board covers this for now), no dedicated contact detail page, no global search, CSV export exists for companies/contacts/deals/activities but not yet client-scoped entities.

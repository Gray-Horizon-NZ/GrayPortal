# Gray Portal

The operating system for Gray Horizon, a solo-led premium digital marketing agency in Auckland. It replaces Notion as the business's information and data powerhouse — Drive stays the file store, Xero stays the books — and ties CRM, client relationships, internal operations, and AI-agent-driven fulfillment together in one place. Business logic lives in a single data access layer, so the same capability is available identically to a human clicking a button, an admin using the API, and Claude acting as an agent through MCP.

Full feature inventory, architectural principles, and who-uses-what: [`docs/Master-Brief.md`](docs/Master-Brief.md). What's still open: [`docs/Open-Work-Brief.md`](docs/Open-Work-Brief.md).

## What's built

CRM core (companies, contacts, deals, activities, documents, configurable pipeline), a client portal (tasks, documents, referrals, Ideation, Roadmap, Meeting Summaries, Tool Stack, Drive/Looker embeds), a contractor portal, an encrypted Credential Vault (MFA-gated reveal), a structured Pricing Catalogue with per-service overrides and an MRR dashboard, a GrayScale product catalogue with admin-editable pricing — plus **Apexus** (`/apexus`), a standalone live quote-builder tool (`public/apexus/quote-builder.html`, embedded via iframe) for curating a package and exporting a client-facing quote document, fed live pricing from both of those catalogues via `GET /api/apexus-pricing` rather than carrying its own copy of the numbers — a read-only Xero financial snapshot, unified in-app + email notifications, one-way Google Calendar/Tasks sync, automated client health scoring, full-text search, a homepage command center, a recurring task/reminder engine, a Mobile Operations Package, rules-based security monitoring, an MCP server exposing the DAL to Claude, an AI task planner, an internal (business-wide, non-client) Ideation tab and AI Agents tracker, and internal tools (personal finance / "Owner's Cut" calculator, business expenses tracker, Master Task View).

**Email system:** native Gmail send/receive built around one branded HTML design shell (`src/lib/email/chrome.ts`) everything renders through. **Email Triage** (`/email-triage`, renamed from the earlier "Inbox") triages inbound mail Gmail sync couldn't auto-match to a Contact, plus a **Client Emails** tab showing every matched client conversation in one feed; a contact known to email from more than one address can be taught its aliases, either inline from a match or from the Client Emails tab, so future mail from any of them auto-matches. **Email Templates** (`/email-templates`) are HTML with a live sanitized preview, used both for one-off compose and as a starting point for campaigns. **Email Campaigns** (`/email-campaigns`) are audience blast sends — clients by default, optionally open-pipeline prospects too — queued and sent through a throttled cron batch (`api/cron/run-email-campaigns`) separate from one-off send's own rate limit, with per-recipient status tracking. Deliberately no unsubscribe/opt-out machinery: these are relationship notifications to an existing audience, not unsolicited marketing.

What's still open — the rest of the "GrayScale" product family (Tempus scheduling, Solus branding, suggested-moves intelligence) and client portal template variations (service vs. subscription-only clients) — is tracked in `docs/Open-Work-Brief.md`, along with what's blocked and on what.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript), Node runtime throughout (including `proxy.ts` — Next 16 defaults Proxy/Middleware to Node, not Edge)
- **Database:** Neon Postgres (Sydney region), Drizzle ORM + drizzle-kit migrations
- **Auth:** Firebase Auth (Google provider only), session cookies (14-day max, Firebase's hard limit), server-side email allowlist
- **Isolation:** Postgres Row-Level Security is the actual enforcement; the DAL (`src/lib/dal`) is the ergonomic layer on top
- **Agent access:** MCP server at `/api/mcp` — authenticates with the same Firebase session mechanism as the browser (a Bearer-token variant of the same session cookie, minted from Settings), goes through the same RLS, same audit log, same DAL as every human request
- **External systems:** one adapter module per integration — Google (Calendar/Tasks/Gmail, `src/lib/google/`), Xero (`src/lib/xero/`) — no external API call happens outside its dedicated adapter
- **Hosting:** Firebase App Hosting (Cloud Run–backed), custom domain `app.grayhorizon.nz`
- **Styling:** Plain CSS + design tokens (`src/app/tokens.css`), no UI framework

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values (ask Max for the Neon connection strings, Firebase Admin service account, and the Google/Xero OAuth client credentials).
3. `npm run db:migrate` — applies Drizzle migrations, then RLS policies + role/privilege lockdown (`db/sql/`). Safe to re-run against a fresh database; re-running after the runtime role already exists will error on `CREATE ROLE` — apply individual new `db/sql/*.sql` files directly instead.
4. `npm run db:seed` — seeds the allowlisted admin users and a realistic sample pipeline.
5. `npm run dev`

## Architecture notes worth knowing before touching auth or the DAL

- **`src/proxy.ts`** is the network-boundary check: every route except `/login` requires a valid Firebase session cookie, or it redirects. It does NOT check the allowlist or role — that needs Postgres, and happens in the DAL. `/api/mcp/*` and `/api/cron/*` are carved out of the redirect behavior (a non-browser client can't follow an HTML redirect to `/login`) — those routes enforce their own auth and return a proper 401/JSON instead.
- **`src/lib/dal/session.ts`** (`withSession`) resolves a verified Firebase UID to an internal `users` row inside a single Postgres transaction, and binds `app.role` / `app.user_id` / `app.client_id` as session variables for that transaction via `set_config(..., true)`. Every query issued through that transaction is filtered by the RLS policies in `db/sql/001_roles_and_rls.sql` — this is the real tenant-isolation guarantee, not a convention.
- **`withAdminScope(reason, fn)`** is the one escape hatch for admin-wide access with no real caller (cron jobs, seed scripts). Grep for it in review — every use should be a deliberate, visible decision.
- **Tenant model:** `clients` is a separate table from `companies` — a company becomes a client only via a deliberate act, not implicitly. Internal CRM tables (`companies`, `contacts`, `deals`, `activities`) carry no `client_id` at all. Only tables meant to be client-portal-visible (`tasks`, `documents`, `referrals`, `client_features`, and everything added in the portal-expansion phase) carry a real `client_id`. See the schema comments in `src/lib/db/schema.ts` for why — an earlier draft got this wrong by keying isolation off `company_id`, which would have leaked deal economics to a client the moment they got portal access.
- **Audit log is append-only at the database level**, not just by convention: the runtime `grayportal_app` Postgres role has `SELECT, INSERT` on `audit_log` only — `UPDATE`/`DELETE`/`TRUNCATE` are explicitly revoked (`db/sql/002_audit_lockdown.sql`). Writing a row happens automatically inside `src/lib/dal/mutate.ts`'s `auditedInsert`/`auditedUpdate`/`auditedSoftDelete` — entity DAL modules use these instead of raw `tx.insert`/`tx.update`, so it's structurally impossible to mutate data without an audit row in the same transaction. Sensitive reads (credential vault reveals, MOP downloads) hit the audit log too, at the same severity as a mutation.
- **No hard deletes anywhere:** the runtime role has no `DELETE` grant on any business table, enforced at the database, not just by app code discipline.
- **Secrets encryption:** Google OAuth refresh tokens, Xero OAuth refresh tokens, and Credential Vault secrets are each encrypted with `pgcrypto` under their own dedicated key (`GOOGLE_TOKEN_ENCRYPTION_KEY`, `XERO_TOKEN_ENCRYPTION_KEY`, `CREDENTIAL_VAULT_ENCRYPTION_KEY`) so rotating one never touches another's data. Viewing a decrypted vault secret requires a fresh MFA/re-auth challenge, not just an active session.
- **Known RLS gotcha (found by the test suite, fixed in `db/sql/004` and re-fixed for later tables in `013`/`016`):** casting an unset/empty session variable straight to `::uuid` throws instead of behaving like "no match," because Postgres does not reliably short-circuit past it. Every policy that compares an ID column to a session variable wraps it in `nullif(current_setting(...), '')::uuid`. If you add a new client-scoped table, copy that pattern.
- **Known gap:** CSV export (`/api/export/[entity]`) covers `companies`/`contacts`/`deals`/`activities` only — client-scoped entities (tasks, documents, referrals) aren't exportable yet.

## Security tests

`npm run test` runs Vitest across `tests/` — `tests/security/*.test.ts` (RLS isolation, allowlist enforcement, Google connection scoping) and `tests/dal/*.test.ts` — against the real Neon database, since the enforcement is at the database level and testing it any other way would test the DAL's ergonomics, not the actual guarantee. CI (`.github/workflows/ci.yml`) runs lint, this test suite, and a full build on every push/PR; branch protection on `main` requires it to pass before merge.

## Deploy model

- **Prod:** Firebase App Hosting's GitHub Developer Connect integration watches `main` directly — pushing to `main` (after CI passes) triggers a Cloud Build → Cloud Run rollout automatically. No separate "deploy" GitHub Action for prod.
- **PR previews:** `.github/workflows/pr-preview.yml` scripts a dedicated App Hosting backend per PR (App Hosting's native preview model is a single shared preview branch, not per-PR — a deliberate tradeoff). Validated against a real PR.
- **Domain:** live at `app.grayhorizon.nz` (Cloudflare DNS → Firebase-issued certificate).
- **Rollback:** `firebase apphosting:rollouts:create grayportal --git-commit <previous-good-sha> --force` rolls straight back to any prior commit without touching the local checkout. Manual `firebase deploy --only apphosting` from a checked-out older commit is the fallback if the GitHub connection is ever down.

## Environment & secrets

`.env.example` documents every variable needed locally. In production, secrets are held in Firebase Secret Manager and wired into the runtime via `apphosting.yaml`'s `secret:` refs (`firebase apphosting:secrets:set <NAME>` to set/rotate one) — nothing sensitive is checked into the repo. `NEXT_PUBLIC_FIREBASE_*` values are the exception: they're client-side config, safe to expose, and are inlined directly in `apphosting.yaml` rather than pulled from Secret Manager. CI needs its own copy of the non-secret-manager values as GitHub Actions secrets (`DATABASE_URL`, `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`) to run migrations/tests/build.

On App Hosting itself, the Firebase Admin SDK picks up the attached Cloud Run service account automatically (`applicationDefault()`) — no explicit `FIREBASE_ADMIN_*` key needed in production, only for local dev.

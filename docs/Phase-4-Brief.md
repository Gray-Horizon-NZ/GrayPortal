# Gray Horizon Ops Dashboard — Build Brief: Phase 4 (MCP Server)

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** A read-heavy, low-risk-write MCP server exposing existing DAL capabilities to Claude. Do not build the Today view — Dashboard-Brief.md §9 says it's built last, as a composition of everything else, and it isn't next.

---

## 0. Read this first

Every prior brief in this repo has said the same thing about this phase: business logic lives in the application layer, never the UI, specifically so it could be exposed over MCP later without a rewrite. This is that later. If a tool here needs logic that doesn't already exist in `src/lib/dal/`, the logic goes in the DAL, and the MCP tool is a thin wrapper — same discipline as every route handler and Server Action so far.

Two rules that override everything else in this brief:

1. **No new authorization model.** MCP requests authenticate as the same Firebase-session-backed `Caller` every other request resolves to, and go through the same RLS. This phase does not introduce a service-role bypass, a static API key, or anything that skips `withCaller`/RLS.
2. **Scope stays narrow this phase.** Read-heavy tools plus two low-risk writes (log an activity, update a task's status) — signed off with Max. No deal-stage changes, no money fields, no client invites, no document uploads, no Google connection management over MCP yet.

---

## 1. What this is

An MCP server at `/api/mcp` that lets an MCP client (Claude Desktop, Claude Code, claude.ai) call into GrayPortal's existing application layer — list/search the pipeline, read a deal or company, log an activity, update a task's status — the same functions the dashboard UI already calls, with the same RLS enforcement, same audit logging, same everything. Admin-only in this phase (Max signs in via GrayPortal, gets a token, pastes it into his MCP client config).

## 2. Authentication — signed off with Max

**MCP requests authenticate with the same Firebase session cookie mechanism as the browser** — no new credential type. Concretely:

- `/api/mcp/token` (new route): the Settings page's "Get MCP access token" button gets a fresh Firebase ID token client-side (`getIdToken(true)`), POSTs it here, and the server mints a session cookie via the exact same `adminAuth.createSessionCookie()` call `/api/auth/session` already uses — except this route returns the value in the JSON response instead of setting it as an httpOnly cookie, so Max can copy it into an MCP client's `Authorization: Bearer <token>` header config.
- **This deliberately never exposes the browser's actual live session cookie** (which stays httpOnly, unreadable to JS, exactly as designed) — it mints a fresh, separate one for this purpose only.
- `src/lib/dal/auth.ts`'s `getVerifiedUid()` gains a fallback: if no session cookie is present on the request, check `Authorization: Bearer <token>` and verify it the same way (`adminAuth.verifySessionCookie`). Every existing DAL function already calls `withCaller()` → `getVerifiedUid()`, so this one change is what makes the existing `listDeals()`, `getDeal()`, etc. work unmodified from an MCP tool — no DAL function needed rewriting for this phase.
- **This is the same secret, just a second transport for it** — a Bearer token accepted this way carries exactly the privileges the browser cookie already carries, for the same 14-day life. It is not a lower-privilege or differently-scoped credential, and must be treated like one: never logged, never committed, copied once and stored only in the MCP client's own local config.
- `proxy.ts`'s cookie-redirect gate is bypassed specifically for `/api/mcp/*` (same treatment as `/api/cron`'s bearer-secret carve-out) — a non-browser client can't follow an HTML redirect to `/login` anyway, so a proper 401 JSON response is what should happen there instead, and the route itself (not the redirect) is the enforcement point.
- A **"Revoke all sessions"** action is added to Settings (`adminAuth.revokeRefreshTokens`) as the way to invalidate a leaked token — it also signs out the browser session, which is the correct trade-off for an emergency revoke.

## 3. Tools (Phase 4 scope)

| Tool | Type | Wraps |
|---|---|---|
| `list_deals` | read | `deals.ts#listDeals` |
| `get_deal` | read | `deals.ts#getDeal` |
| `list_companies` | read | `companies.ts#listCompanies` |
| `get_company` | read | `companies.ts#getCompany` |
| `list_tasks` | read | `tasks.ts#listMyTasks` |
| `search` | read | new `search.ts#searchAll` (extracted from the search page, which called this inline — business logic doesn't belong in the page) |
| `log_deal_activity` | low-risk write | `activities.ts#logActivity` |
| `set_task_status` | low-risk write | `tasks.ts#setTaskStatus` |

Read tools are marked `readOnlyHint: true` in their MCP annotations so a client can auto-approve them; the two write tools are not, so a client's default behavior is to prompt. The server can hint this; it cannot force a client's approval UX — that's the client's own policy.

## 4. Not in scope this phase

Deal-stage changes, deal value/close-reason edits, company/contact/document/referral/client mutations, client invites, Google connection management, any tool that touches money or client-facing data. All exist in the DAL already and could become tools later the same way — deliberately not yet.

## 5. Working method

Same as every prior phase: propose before building (done, above), PR description explains the security properties of the auth change specifically (it widens what a Bearer header can do across the whole app, not just `/api/mcp` — call that out explicitly, don't bury it).

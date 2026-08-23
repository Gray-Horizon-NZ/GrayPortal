# GrayPortal — Owner Notes Backlog Brief: Phase 21 Onward

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** Originally translated Max's 2026-08-22 working-review notes into scoped phases (21–26). As of 2026-08-23, everything in that original scope is built and resolved **except** the Google OAuth client fix and the GrayScale product family (Apexus/Tempus/Solus/suggested-moves) — this document now tracks only those two remaining items. Companion to `Master-Brief.md`, `Dashboard-Brief.md`, `Phase-2` through `Phase-5-Brief.md`, and `Moving-Forward-Brief.md` for system context.

---

## 0. Read this first

Same non-negotiable rules as `Moving-Forward-Brief.md` §0:

1. **Security is structural, not a checklist.**
2. **Business logic lives in the application layer** — DAL first, MCP tool second (if applicable), UI third.
3. **Do not anticipate.** Build the phase you're given, not the next one.
4. **Every new write capability gets an MCP tool risk tier at build time**, per `Phase-4-Brief.md`'s pattern.

Point a session at one item at a time. GrayScale (§2) has open questions blocking a clean start — don't guess on those, ask Max first (collected in §3).

---

## 1. Google OAuth "Error 401: invalid_client"

This is the dedicated Calendar/Tasks/Gmail OAuth client (`src/lib/google/oauth.ts`), a **separate** OAuth 2.0 client from Firebase Auth sign-in — don't confuse the two when debugging. `invalid_client` / "OAuth client was not found" means the client ID Google is being sent doesn't match a live OAuth 2.0 Web-application client in Google Cloud Console — it was deleted, belongs to the wrong project, or the secret holds a stale/placeholder value.

- `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI` are empty in local `.env.local` (checked, not printed) — expected for local dev, but confirm the production values in Firebase Secret Manager (`apphosting.yaml` wires them via `secret:` refs) actually correspond to a live client.
- Fix is operational, not code: in Google Cloud Console (project backing `grayhorizon-grayportal`), verify/recreate a Web-application OAuth 2.0 client with `https://app.grayhorizon.nz/api/google/oauth/callback` as an authorized redirect URI, then `firebase apphosting:secrets:set GOOGLE_OAUTH_CLIENT_ID` (and SECRET/REDIRECT_URI) with the real values.
- Small code hardening while in this area: `/settings`'s "Connect Google" button should check these env vars server-side and show a clear "not configured" state instead of only surfacing Google's raw error after redirect.

---

## 2. "GrayScale" additions

Framed as the umbrella Max's notes group these four under — **confirm that reading is correct before scoping** (§3). All four are greenfield; nothing named Apexus, Tempus, or Solus exists in the repo today beyond a placeholder `grayscale_page` feature key and a placeholder tile on the redesigned client portal's GrayScale page.

### 2.1 Apexus — live quote tool
Expandable right-side panel on `/pricing` for building custom quotes. The pricing catalogue (`dal/pricing.ts`'s `serviceModules`/`serviceItems`) already exists and is exactly the data a quote builder would sum over. **Open question** (§3): is Apexus meant to be a client-side calculator over this existing catalogue (cheapest, most consistent build), or is it an existing external tool of Max's to integrate/embed? Don't scope further until this is answered.

### 2.2 "Powered by Solus" footer
A placeholder version already shipped as part of the client portal redesign — every `/portal/*` page footer reads "Built with Solus" with a placeholder brass glyph (`src/components/portal/PortalShell.tsx`). Needs the real Solus wordmark/icon asset and link target from Max to swap in.

### 2.3 Tempus (replaces Calendly)
Explicitly flagged by Max as a **later project** — leave it there. Also has a real dependency: booking needs to *write* calendar events, and Phase 3's Google Calendar sync is one-way by deliberate prior decision (`Moving-Forward-Brief.md` §17). That decision needs reopening before this phase can start, not just a UI build.

### 2.4 Suggested moves (last-contacted / client patterns)
Explicitly flagged by Max as a **later big project**. Same shape as the already-deferred AI Task Planner. Treat as deferred, not scheduled, until Max prioritizes it.

---

## 3. Open items for Max

1. **Google OAuth client** — need Google Cloud Console access confirmed to verify/recreate the Calendar/Tasks/Gmail OAuth client for the production project.
2. **GrayScale umbrella** — confirm it's the umbrella term for Apexus / Solus branding / Tempus / suggested-moves, or something else entirely.
3. **Apexus** — a calculator over the existing pricing catalogue, or an external tool to integrate?
4. **Solus** — real wordmark/icon asset and link target, to replace the current placeholder.
5. **Tempus** — confirm scope/timing given the two-way Calendar sync dependency it reopens.

---

## 4. Resolved (no longer tracked here)

Everything else from the original Phase 21–26 scope is built as of 2026-08-23: quick fixes (document titles, empty-widget suppression), the client portal UI redesign (now a full visual rebuild, not the original bento-grid ask), the personal finance calculator (shipped as the Owner's Cut Calculator), the full task system overhaul (generic task creation, admin-selectable assignees, Master Task View with client/prospect columns, client-name and prospect linking throughout the Tasks tab), and inbox triage was confirmed already live. See git history / current code rather than this doc for how any of it works now.

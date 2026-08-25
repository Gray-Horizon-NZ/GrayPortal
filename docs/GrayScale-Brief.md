# GrayPortal — Pending Work: GrayScale

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Scope of this brief:** The only work still open as of 2026-08-25. Every phase in the original build queue (0–20) plus the 2026-08-22 owner-review backlog (Phase 21–24: quick fixes, personal finance calculator, task system overhaul, client portal redesign) is built. The Google OAuth `invalid_client` issue that used to be tracked here was fixed 2026-08-25. What remains is the "GrayScale" product family. Companion to `Master-Brief.md` for system context.

---

## 0. Read this first

Same non-negotiable rules that applied to every phase before this one:

1. **Security is structural, not a checklist.**
2. **Business logic lives in the application layer** — DAL first, MCP tool second (if applicable), UI third.
3. **Do not anticipate.** Build the item you're given, not the next one.
4. **Every new write capability gets an MCP tool risk tier at build time**, per the pattern the MCP server phase established.

Point a session at one item at a time. GrayScale has open questions blocking a clean start — don't guess on those, ask Max first (collected in §2).

---

## 1. "GrayScale" additions

The umbrella Max's notes group these four under — **confirm that reading is correct before scoping** (§2). All four are greenfield; nothing named Apexus, Tempus, or Solus exists in the repo today beyond a placeholder `grayscale_page` feature key and a placeholder tile on the client portal's GrayScale page.

### 1.1 Apexus — live quote tool
Expandable right-side panel on `/pricing` for building custom quotes. The pricing catalogue (`dal/pricing.ts`'s `serviceModules`/`serviceItems`) already exists and is exactly the data a quote builder would sum over. **Open question** (§2): is Apexus meant to be a client-side calculator over this existing catalogue (cheapest, most consistent build), or is it an existing external tool of Max's to integrate/embed? Don't scope further until this is answered.

### 1.2 "Powered by Solus" footer
A placeholder version already shipped as part of the client portal redesign — every `/portal/*` page footer reads a Solus credit line with a placeholder brass glyph (`src/components/portal/PortalShell.tsx`). Needs the real Solus wordmark/icon asset and link target from Max to swap in.

### 1.3 Tempus (replaces Calendly)
Explicitly flagged by Max as a **later project** — leave it there. Also has a real dependency: booking needs to *write* calendar events, and the existing Google Calendar sync is one-way by deliberate prior decision. That decision needs reopening before this phase can start, not just a UI build.

### 1.4 Suggested moves (last-contacted / client patterns)
Explicitly flagged by Max as a **later big project**. Same shape as the already-built AI Task Planner but for relationship/contact-timing signals rather than tasks. Treat as deferred, not scheduled, until Max prioritizes it.

---

## 2. Open items for Max

1. **GrayScale umbrella** — confirm it's the umbrella term for Apexus / Solus branding / Tempus / suggested-moves, or something else entirely.
2. **Apexus** — a calculator over the existing pricing catalogue, or an external tool to integrate?
3. **Solus** — real wordmark/icon asset and link target, to replace the current placeholder.
4. **Tempus** — confirm scope/timing given the two-way Calendar sync dependency it reopens.

---

## 3. Resolved (no longer tracked here)

- **Google OAuth `Error 401: invalid_client`** — fixed 2026-08-25. Calendar/Tasks/Gmail integrations are live in production.
- Everything from the original Phase 0–20 build queue and the 2026-08-22 owner-review backlog (Phase 21–24). See git history / current code for how any of it works now — `Master-Brief.md` §4 has the feature inventory.

# GrayPortal — Internal Ideation Tab (future scoping note)

**For:** Claude Code
**Owner:** Max Fawcett, Gray Horizon (Auckland, NZ)
**Status:** Not scoped, not started — captured here per Max's 2026-08-25 request so it isn't lost. Do not build from this note alone; it needs a proper scoping pass first (open questions below), same as GrayScale in `Phase-21-Onward-Brief.md`.

---

## The idea

A tab for Max's own internal/business ideas — distinct from the existing **client** ideation feature (`src/lib/dal/ideation.ts`, `listIdeationItems(clientId)`), which is strictly per-client and shown on each client's detail page and portal. This would be business-wide, not tied to any client.

## Open questions before scoping

1. Reuse the existing ideation data model (title/description/status) scoped to `clientId: null`, or a genuinely separate table/feature?
2. Where does it live in the nav — its own top-level page, or folded into an existing admin-only area?
3. Any workflow beyond capture (e.g. status tracking, converting an idea into a roadmap item or a deal), or just a running list?

Same rule as the rest of this doc set applies once this gets scoped: build the phase given, not more.

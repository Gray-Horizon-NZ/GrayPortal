import "server-only";
import { companies, contacts, deals, tasks, ideationItems, roadmapItems, meetingSummaries, emails } from "@/lib/db/schema";
import { and, isNull, or, ilike } from "drizzle-orm";
import { withCaller } from "./auth";

// Phase 15 — extends Phase 1's field-matching search to span everything
// built since (tasks, Ideation/Roadmap/Meeting Summaries from Phase 8;
// email subject/snippet from Phase 10, added once that phase existed).
// Still plain ILIKE, not Postgres full-text search — the brief explicitly
// says not to reach for that "without justifying it," and at this data
// volume (single-agency, low-hundreds of rows) a GIN/tsvector index would
// be pure overhead with no measurable benefit yet. Exposed identically
// through the UI (src/app/(app)/search/page.tsx) and the MCP `search` tool
// (src/app/api/mcp/route.ts), both calling this one function.
export async function searchAll(query: string) {
  return withCaller(async (_caller, tx) => {
    const term = `%${query}%`;
    const companyRows = await tx
      .select()
      .from(companies)
      .where(and(isNull(companies.deletedAt), ilike(companies.name, term)));
    const contactRows = await tx
      .select()
      .from(contacts)
      .where(
        and(
          isNull(contacts.deletedAt),
          or(ilike(contacts.firstName, term), ilike(contacts.lastName, term), ilike(contacts.email, term))
        )
      );
    const dealRows = await tx
      .select()
      .from(deals)
      .where(and(isNull(deals.deletedAt), ilike(deals.nextAction, term)));
    const taskRows = await tx
      .select()
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), ilike(tasks.title, term)));
    const ideationRows = await tx
      .select()
      .from(ideationItems)
      .where(and(isNull(ideationItems.deletedAt), or(ilike(ideationItems.title, term), ilike(ideationItems.description, term))));
    const roadmapRows = await tx
      .select()
      .from(roadmapItems)
      .where(and(isNull(roadmapItems.deletedAt), or(ilike(roadmapItems.title, term), ilike(roadmapItems.description, term))));
    const meetingRows = await tx
      .select()
      .from(meetingSummaries)
      .where(and(isNull(meetingSummaries.deletedAt), or(ilike(meetingSummaries.title, term), ilike(meetingSummaries.summary, term))));
    const emailRows = await tx
      .select()
      .from(emails)
      .where(and(isNull(emails.deletedAt), or(ilike(emails.subject, term), ilike(emails.snippet, term))));
    return { companyRows, contactRows, dealRows, taskRows, ideationRows, roadmapRows, meetingRows, emailRows };
  });
}

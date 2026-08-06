import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { getVerifiedUid, withCaller } from "@/lib/dal/auth";
import { assertRole } from "@/lib/dal/session";
import { listDeals, getDeal } from "@/lib/dal/deals";
import { listCompanies, getCompany } from "@/lib/dal/companies";
import { listMyTasks, setTaskStatus, TaskStatus } from "@/lib/dal/tasks";
import { searchAll } from "@/lib/dal/search";
import { logActivity } from "@/lib/dal/activities";
import { onboardClient, OnboardClientInput } from "@/lib/dal/onboarding";

// The MCP server exposing GrayPortal's existing application layer to
// Claude (Phase 4 brief). Every tool below is a thin wrapper around a DAL
// function that already exists and is already called by the dashboard UI —
// no new business logic lives here, per every prior brief's rule that
// logic belongs in the DAL, not the surface that happens to call it.
// Tool calls go through withCaller/RLS exactly like a browser request; the
// only thing Phase 4 added is a second way to prove who's calling
// (src/lib/dal/auth.ts's Bearer fallback), not a second set of privileges.
function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function buildServer() {
  const server = new McpServer({ name: "grayportal", version: "1.0.0" });

  server.registerTool(
    "list_deals",
    { description: "List all open (non-deleted) deals in the pipeline.", annotations: { readOnlyHint: true } },
    async () => jsonResult(await listDeals())
  );

  server.registerTool(
    "get_deal",
    {
      description: "Get a single deal by id, with its activity timeline and linked tasks.",
      inputSchema: { id: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => jsonResult(await getDeal(id))
  );

  server.registerTool(
    "list_companies",
    {
      description: "List companies, optionally filtered by a name substring.",
      inputSchema: { search: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ search }) => jsonResult(await listCompanies(search))
  );

  server.registerTool(
    "get_company",
    {
      description: "Get a single company by id, with its contacts and deals.",
      inputSchema: { id: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => jsonResult(await getCompany(id))
  );

  server.registerTool(
    "list_tasks",
    { description: "List all tasks (across deals and clients).", annotations: { readOnlyHint: true } },
    async () => jsonResult(await listMyTasks())
  );

  server.registerTool(
    "search",
    {
      description: "Search companies, contacts, and deals by a text query.",
      inputSchema: { query: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => jsonResult(await searchAll(query))
  );

  server.registerTool(
    "log_deal_activity",
    {
      description: "Log a call, email, meeting, or note against a deal or contact.",
      inputSchema: {
        dealId: z.string().uuid().optional(),
        contactId: z.string().uuid().optional(),
        type: z.enum(["call", "email", "meeting", "note"]),
        body: z.string().optional(),
        outcome: z.string().optional(),
      },
      annotations: { readOnlyHint: false },
    },
    async (args) => jsonResult(await logActivity(args))
  );

  server.registerTool(
    "set_task_status",
    {
      description: "Update a task's status.",
      inputSchema: { id: z.string().uuid(), status: TaskStatus },
      annotations: { readOnlyHint: false },
    },
    async ({ id, status }) => jsonResult(await setTaskStatus(id, status))
  );

  server.registerTool(
    "onboard_client",
    {
      description:
        "Creates a new client end-to-end in one transaction: company, client record, a portal login " +
        "invite (unclaimed until the client's first Google sign-in), the requested portal features " +
        "enabled, and a standard starter task list. Structure the input from whatever source material " +
        "you were given (a brief, a spreadsheet, a conversation) before calling — this tool does no " +
        "parsing of its own. Creates real records every time it's called; never call it speculatively " +
        "or twice for the same client.",
      inputSchema: OnboardClientInput.shape,
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async (args) => jsonResult(await onboardClient(args))
  );

  return server;
}

export async function POST(request: NextRequest) {
  // Deny-by-default, checked here rather than left to proxy.ts (which
  // exempts this exact path — see proxy.ts's BEARER_AUTH_EXACT_PATHS
  // comment for why). Admin-only in this phase: no contractor/client use
  // case for MCP tools yet.
  const uid = await getVerifiedUid();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await withCaller(async (caller) => assertRole(caller, "admin"));
  } catch {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no in-memory session to keep across Cloud Run instances
    enableJsonResponse: true, // plain JSON responses, not an SSE stream, for this request/response tool-call shape
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

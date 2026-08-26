import { NextRequest, NextResponse } from "next/server";
import { rawPool } from "@/lib/db/client";

// TEMPORARY — verifying the hand-applied migration (0018-0022 + 022 RLS
// policy) actually landed, without needing an authenticated admin session.
// Remove after confirming.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await rawPool.connect();
  try {
    const cols = await client.query(
      `select table_name, column_name, data_type from information_schema.columns
       where (table_name = 'google_connections' and column_name in ('selected_calendar_ids','calendar_settings'))
          or (table_name = 'clients' and column_name in ('google_task_list_id','hidden_from_task_view'))
          or (table_name = 'tasks' and column_name = 'google_task_list_id')
          or (table_name = 'ideation_items' and column_name in ('category','client_id'))
       order by table_name, column_name`
    );
    const table = await client.query(
      `select table_name from information_schema.tables where table_name = 'internal_tasklist_mappings'`
    );
    const policy = await client.query(
      `select policyname, qual from pg_policies where tablename = 'ideation_items' and policyname = 'ideation_items_scoped'`
    );
    return NextResponse.json({ columns: cols.rows, internal_tasklist_mappings_exists: table.rows.length > 0, policy: policy.rows });
  } finally {
    client.release();
  }
}

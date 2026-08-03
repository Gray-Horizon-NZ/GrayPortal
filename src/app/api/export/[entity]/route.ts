import { NextRequest, NextResponse } from "next/server";
import { withCaller } from "@/lib/dal/auth";
import { companies, contacts, deals, activities } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

const TABLES = { companies, contacts, deals, activities } as const;
type EntityName = keyof typeof TABLES;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!(entity in TABLES)) {
    return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  }
  const table = TABLES[entity as EntityName];

  const rows = await withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(table)
      .where(isNull(table.deletedAt));
  });

  const csv = toCsv(rows as Record<string, unknown>[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${entity}.csv"`,
    },
  });
}

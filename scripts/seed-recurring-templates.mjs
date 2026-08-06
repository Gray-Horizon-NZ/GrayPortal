// Phase 17 — the three templates the brief says to ship with. Run once,
// by hand, after migrations are applied: node scripts/seed-recurring-templates.mjs
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const templates = [
  { name: "Refresh Mobile Operations Package", interval: "monthly", nextDueDate: inDays(30), taskTitle: "Refresh the Mobile Operations Package" },
  { name: "Run backup restore drill", interval: "quarterly", nextDueDate: inDays(90), taskTitle: "Run backup restore drill" },
  { name: "Review client health scores", interval: "monthly", nextDueDate: inDays(30), taskTitle: "Review client health scores" },
];

await client.query("BEGIN");
for (const t of templates) {
  await client.query(
    `INSERT INTO recurring_templates (name, interval, next_due_date, task_title)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (SELECT 1 FROM recurring_templates WHERE name = $1 AND deleted_at IS NULL)`,
    [t.name, t.interval, t.nextDueDate, t.taskTitle]
  );
}
await client.query("COMMIT");
await client.end();
console.log(`Seeded ${templates.length} recurring templates (skipped any that already existed).`);

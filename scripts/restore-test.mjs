import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const c = new Client(process.env.DATABASE_URL_UNPOOLED);
await c.connect();

await c.query(
  "INSERT INTO companies (name, source, notes) VALUES ('__RESTORE_TEST_MARKER_3__', 'restore-test', 'Backup/restore test row, brief §5.7 - attempt 3, wide margin')"
);
console.log("Inserted marker at", new Date().toISOString());

console.log("Waiting 3 minutes before checkpoint...");
await new Promise((r) => setTimeout(r, 3 * 60_000));

const t = await c.query("SELECT now() as t");
const checkpoint = t.rows[0].t.toISOString();
console.log("CHECKPOINT_TIME=" + checkpoint);

console.log("Waiting 3 more minutes before delete...");
await new Promise((r) => setTimeout(r, 3 * 60_000));

const res = await c.query("DELETE FROM companies WHERE name = '__RESTORE_TEST_MARKER_3__' RETURNING id");
console.log("Deleted rows:", res.rowCount, "at", new Date().toISOString());

await c.end();
console.log("DONE. Use CHECKPOINT_TIME above to create the restore branch.");

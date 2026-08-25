import { Client } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const files = ["db/migrations/0017_add_dev_costs.sql", "db/sql/020_dev_costs.sql"];

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

for (const file of files) {
  const sql = readFileSync(file, "utf8");
  console.log(`Applying ${file}...`);
  await client.query(sql);
  console.log(`Applied ${file}`);
}

await client.end();
console.log("Done.");

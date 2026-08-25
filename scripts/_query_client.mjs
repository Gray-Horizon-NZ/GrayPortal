import { Client } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });
const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();
const res = await client.query(`
  SELECT c.id, c.name, c.deleted_at,
    json_agg(json_build_object('deliverable', si.deliverable, 'monthly', COALESCE(cs.custom_monthly_price, si.current_monthly_price), 'status', cs.status)) AS services
  FROM clients c
  LEFT JOIN client_services cs ON cs.client_id = c.id AND cs.deleted_at IS NULL
  LEFT JOIN service_items si ON si.id = cs.service_item_id
  WHERE c.name ILIKE '%rider%'
  GROUP BY c.id, c.name, c.deleted_at
`);
console.log(JSON.stringify(res.rows, null, 2));
await client.end();

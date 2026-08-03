import { Client } from "@neondatabase/serverless";

export function ownerClient() {
  return new Client(process.env.DATABASE_URL_UNPOOLED!);
}

export function appClient() {
  return new Client(process.env.DATABASE_URL!);
}

/** Sets the RLS session vars exactly as src/lib/dal/session.ts does. */
export async function setRlsContext(
  client: Client,
  ctx: { role: "admin" | "contractor" | "client"; userId?: string; clientId?: string }
) {
  await client.query("SELECT set_config('app.role', $1, true)", [ctx.role]);
  await client.query("SELECT set_config('app.user_id', $1, true)", [ctx.userId ?? ""]);
  await client.query("SELECT set_config('app.client_id', $1, true)", [ctx.clientId ?? ""]);
}

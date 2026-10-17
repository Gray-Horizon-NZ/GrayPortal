import { describe, expect, it } from "vitest";
import { ownerClient, appClient, setRlsContext } from "./helpers";

// db/sql/031_contractor_scoping.sql: a contractor session must not reach
// any client, company, price or email. Skipped until 031 is applied (the
// contractor_me view is its marker), so the suite stays green before then.
async function lockdownApplied() {
  const c = ownerClient();
  await c.connect();
  try {
    const r = await c.query("select to_regclass('public.contractor_me') is not null as ok");
    return Boolean(r.rows[0]?.ok);
  } finally {
    await c.end();
  }
}

const applied = await lockdownApplied();

describe.skipIf(!applied)("contractor scoping (031)", () => {
  it("a contractor session sees no clients, companies, prices or emails", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "contractor", userId: "00000000-0000-0000-0000-000000000001" });
      for (const table of ["clients", "companies", "contacts", "client_services", "service_items", "emails", "email_templates", "contractors"]) {
        const r = await client.query(`select count(*)::int as n from ${table}`);
        expect({ table, n: r.rows[0].n }).toEqual({ table, n: 0 });
      }
      const views = await client.query("select count(*)::int as n from contractor_my_engagements");
      expect(views.rows[0].n).toBe(0);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });

  it("an admin session still sees clients", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      const r = await client.query("select count(*)::int as n from clients");
      expect(r.rows[0].n).toBeGreaterThan(0);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});

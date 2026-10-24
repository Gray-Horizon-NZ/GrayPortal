import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { ownerClient, appClient, setRlsContext } from "./helpers";
import { resolveMcpKey } from "@/lib/dal/mcpKeys";

// mcp_api_keys holds admin credentials (hashed), so only the admin role may
// see a row (db/sql/034_mcp_api_keys.sql). Everything runs inside one
// rolled-back transaction, so no key row is ever left behind.

describe("MCP access keys", () => {
  it("only the admin role can see key rows", async () => {
    const owner = ownerClient();
    await owner.connect();
    const { rows } = await owner.query(`SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`);
    await owner.end();
    const adminId = rows[0].id;

    const app = appClient();
    await app.connect();
    try {
      await app.query("BEGIN");
      await setRlsContext(app, { role: "admin", userId: adminId });
      await app.query(`INSERT INTO mcp_api_keys (user_id, key_hash) VALUES ($1, $2)`, [
        adminId,
        "test-" + randomBytes(16).toString("hex"),
      ]);
      const asAdmin = await app.query(`SELECT count(*)::int AS n FROM mcp_api_keys WHERE key_hash LIKE 'test-%'`);
      expect(asAdmin.rows[0].n).toBe(1);

      await setRlsContext(app, { role: "contractor", userId: adminId });
      const asContractor = await app.query(`SELECT count(*)::int AS n FROM mcp_api_keys`);
      expect(asContractor.rows[0].n).toBe(0);

      await setRlsContext(app, { role: "client", userId: adminId });
      const asClient = await app.query(`SELECT count(*)::int AS n FROM mcp_api_keys`);
      expect(asClient.rows[0].n).toBe(0);
    } finally {
      await app.query("ROLLBACK").catch(() => {});
      await app.end();
    }
  });

  it("rejects an unknown key and a value without the gpk_ prefix", async () => {
    expect(await resolveMcpKey("gpk_" + randomBytes(32).toString("base64url"))).toBeNull();
    expect(await resolveMcpKey("not-a-key")).toBeNull();
  });
});

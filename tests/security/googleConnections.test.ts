import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ownerClient, appClient, setRlsContext } from "./helpers";

// Phase 3: google_connections holds encrypted Google OAuth refresh tokens.
// No role but admin has ever had a policy branch here (db/sql/005), unlike
// the client-portal tables — this test exists to prove that's actually
// enforced, not just intended.

let owner: ReturnType<typeof ownerClient>;
let userId: string;
let connectionId: string;

beforeAll(async () => {
  owner = ownerClient();
  await owner.connect();

  const userRes = await owner.query(
    `INSERT INTO users (email, role) VALUES ('google-sync-test-admin@example.com', 'admin') RETURNING id`
  );
  userId = userRes.rows[0].id;

  const connRes = await owner.query(
    `INSERT INTO google_connections (user_id, encrypted_refresh_token, scopes)
     VALUES ($1, pgp_sym_encrypt('fake-refresh-token', 'test-key'), ARRAY['https://www.googleapis.com/auth/calendar.events'])
     RETURNING id`,
    [userId]
  );
  connectionId = connRes.rows[0].id;
});

afterAll(async () => {
  await owner.query(`DELETE FROM audit_log WHERE entity_id IN ($1,$2)`, [connectionId, userId]).catch(() => {});
  await owner.query(`DELETE FROM google_connections WHERE id = $1`, [connectionId]);
  await owner.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await owner.end();
});

describe("google_connections RLS (Phase 3)", () => {
  it("an admin-role session can read connection rows", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      const res = await client.query("SELECT id FROM google_connections WHERE id = $1", [connectionId]);
      expect(res.rows.length).toBe(1);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a contractor-role session cannot read connection rows", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "contractor" });
      const res = await client.query("SELECT id FROM google_connections WHERE id = $1", [connectionId]);
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a client-role session cannot read connection rows", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: userId });
      const res = await client.query("SELECT id FROM google_connections WHERE id = $1", [connectionId]);
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("the runtime app role cannot DELETE connection rows (soft delete only)", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      await expect(
        client.query("DELETE FROM google_connections WHERE id = $1", [connectionId])
      ).rejects.toThrow();
      await client.query("ROLLBACK").catch(() => {});
    } finally {
      await client.end();
    }
  });
});

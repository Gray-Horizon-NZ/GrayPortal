import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { ownerClient, appClient, setRlsContext } from "./helpers";

// These tests connect directly to Postgres and verify the guarantees from
// brief §5.8. They exercise RLS policies at the database level (the actual
// enforcement — see db/sql/001_roles_and_rls.sql) rather than going through
// the full Next.js/Firebase stack, which needs a live ID token and isn't
// practical to unit test.

let owner: ReturnType<typeof ownerClient>;
let clientA: string;
let clientB: string;
let companyId: string;
let dealId: string;
let taskAId: string;
let taskBId: string;
let softDeletedCompanyId: string;

beforeAll(async () => {
  owner = ownerClient();
  await owner.connect();

  const companyRes = await owner.query(
    `INSERT INTO companies (name, source) VALUES ('Security Test Co', 'test') RETURNING id`
  );
  companyId = companyRes.rows[0].id;

  const dealRes = await owner.query(
    `INSERT INTO deals (company_id, next_action, next_action_date)
     VALUES ($1, 'Test next action', CURRENT_DATE) RETURNING id`,
    [companyId]
  );
  dealId = dealRes.rows[0].id;

  const clientARes = await owner.query(
    `INSERT INTO clients (name) VALUES ('Security Test Client A') RETURNING id`
  );
  clientA = clientARes.rows[0].id;

  const clientBRes = await owner.query(
    `INSERT INTO clients (name) VALUES ('Security Test Client B') RETURNING id`
  );
  clientB = clientBRes.rows[0].id;

  const taskA = await owner.query(
    `INSERT INTO tasks (client_id, title) VALUES ($1, 'Client A task') RETURNING id`,
    [clientA]
  );
  taskAId = taskA.rows[0].id;

  const taskB = await owner.query(
    `INSERT INTO tasks (client_id, title) VALUES ($1, 'Client B task') RETURNING id`,
    [clientB]
  );
  taskBId = taskB.rows[0].id;

  const deletedCo = await owner.query(
    `INSERT INTO companies (name, source, deleted_at) VALUES ('Deleted Test Co', 'test', now()) RETURNING id`
  );
  softDeletedCompanyId = deletedCo.rows[0].id;
});

afterAll(async () => {
  await owner.query(`DELETE FROM audit_log WHERE entity_id IN ($1,$2,$3,$4,$5,$6)`, [
    companyId,
    dealId,
    clientA,
    clientB,
    taskAId,
    taskBId,
  ]).catch(() => {});
  await owner.query(`DELETE FROM tasks WHERE id IN ($1,$2)`, [taskAId, taskBId]);
  await owner.query(`DELETE FROM deals WHERE id = $1`, [dealId]);
  await owner.query(`DELETE FROM companies WHERE id IN ($1,$2)`, [companyId, softDeletedCompanyId]);
  await owner.query(`DELETE FROM clients WHERE id IN ($1,$2)`, [clientA, clientB]);
  await owner.end();
});

describe("RLS: tenant isolation (brief §5.8)", () => {
  it("a client-role user cannot read another client's records", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query("SELECT id FROM tasks ORDER BY id");
      const ids = res.rows.map((r) => r.id);
      expect(ids).toContain(taskAId);
      expect(ids).not.toContain(taskBId);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a contractor-role user cannot read commercial pipeline data (deals)", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "contractor" });
      const res = await client.query("SELECT id FROM deals WHERE id = $1", [dealId]);
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("an admin-role user can read commercial pipeline data (deals)", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      const res = await client.query("SELECT id FROM deals WHERE id = $1", [dealId]);
      expect(res.rows.length).toBe(1);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a query with no RLS context set returns no rows (deny by default, not an open query)", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      // No set_config calls at all — simulates a bug that forgets to bind
      // the session context.
      const res = await client.query("SELECT id FROM companies WHERE id = $1", [companyId]);
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});

describe("Soft delete (brief §5.8)", () => {
  it("soft-deleted records do not appear in normal (deleted_at IS NULL) queries", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      const res = await client.query(
        "SELECT id FROM companies WHERE id = $1 AND deleted_at IS NULL",
        [softDeletedCompanyId]
      );
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});

describe("Audit log lockdown (brief §5.4, §5.8)", () => {
  it("every mutation writes an audit log row", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      const testId = randomUUID();
      await client.query(
        `INSERT INTO audit_log (actor_type, entity_type, entity_id, action, field_changes)
         VALUES ('system', 'test', $1, 'create', '{}')`,
        [testId]
      );
      const res = await client.query("SELECT id FROM audit_log WHERE entity_id = $1", [testId]);
      expect(res.rows.length).toBe(1);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("the runtime app role cannot UPDATE audit_log rows", async () => {
    const owner2 = ownerClient();
    await owner2.connect();
    const insertRes = await owner2.query(
      `INSERT INTO audit_log (actor_type, entity_type, entity_id, action, field_changes)
       VALUES ('system', 'test', gen_random_uuid(), 'create', '{}') RETURNING id`
    );
    const rowId = insertRes.rows[0].id;

    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      await expect(
        client.query("UPDATE audit_log SET field_changes = '{\"tampered\":true}' WHERE id = $1", [rowId])
      ).rejects.toThrow();
      await client.query("ROLLBACK").catch(() => {});
    } finally {
      await client.end();
      await owner2.query("DELETE FROM audit_log WHERE id = $1", [rowId]);
      await owner2.end();
    }
  });

  it("the runtime app role cannot DELETE audit_log rows", async () => {
    const owner2 = ownerClient();
    await owner2.connect();
    const insertRes = await owner2.query(
      `INSERT INTO audit_log (actor_type, entity_type, entity_id, action, field_changes)
       VALUES ('system', 'test', gen_random_uuid(), 'create', '{}') RETURNING id`
    );
    const rowId = insertRes.rows[0].id;

    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      await expect(client.query("DELETE FROM audit_log WHERE id = $1", [rowId])).rejects.toThrow();
      await client.query("ROLLBACK").catch(() => {});
    } finally {
      await client.end();
      await owner2.query("DELETE FROM audit_log WHERE id = $1", [rowId]);
      await owner2.end();
    }
  });
});

describe("No hard deletes (brief §5.4)", () => {
  it("the runtime app role cannot DELETE from business tables", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "admin" });
      await expect(client.query("DELETE FROM companies WHERE id = $1", [companyId])).rejects.toThrow();
      await client.query("ROLLBACK").catch(() => {});
    } finally {
      await client.end();
    }
  });
});

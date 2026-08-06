import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ownerClient, appClient, setRlsContext } from "./helpers";

// Phase 2 brief §5: client-portal isolation tests, run alongside the
// existing Phase 1 set (rls.test.ts, allowlist.test.ts). These exercise RLS
// directly (the actual enforcement) rather than the full Firebase/Next.js
// stack, same rationale as the existing suite.

let owner: ReturnType<typeof ownerClient>;
let clientA: string;
let clientB: string;
let companyId: string;
let docAId: string;
let docBId: string;
let referralAId: string;
let referralBId: string;

beforeAll(async () => {
  owner = ownerClient();
  await owner.connect();

  const companyRes = await owner.query(
    `INSERT INTO companies (name, source) VALUES ('Portal Security Test Co', 'test') RETURNING id`
  );
  companyId = companyRes.rows[0].id;

  const clientARes = await owner.query(
    `INSERT INTO clients (name) VALUES ('Portal Security Client A') RETURNING id`
  );
  clientA = clientARes.rows[0].id;

  const clientBRes = await owner.query(
    `INSERT INTO clients (name) VALUES ('Portal Security Client B') RETURNING id`
  );
  clientB = clientBRes.rows[0].id;

  const docA = await owner.query(
    `INSERT INTO documents (client_id, company_id, file_ref, doc_type) VALUES ($1, $2, 'documents/a/test.pdf', 'other') RETURNING id`,
    [clientA, companyId]
  );
  docAId = docA.rows[0].id;

  const docB = await owner.query(
    `INSERT INTO documents (client_id, company_id, file_ref, doc_type) VALUES ($1, $2, 'documents/b/test.pdf', 'other') RETURNING id`,
    [clientB, companyId]
  );
  docBId = docB.rows[0].id;

  const refA = await owner.query(
    `INSERT INTO referrals (client_id, referred_name) VALUES ($1, 'Referral for A') RETURNING id`,
    [clientA]
  );
  referralAId = refA.rows[0].id;

  const refB = await owner.query(
    `INSERT INTO referrals (client_id, referred_name) VALUES ($1, 'Referral for B') RETURNING id`,
    [clientB]
  );
  referralBId = refB.rows[0].id;

  await owner.query(
    `INSERT INTO client_features (client_id, feature_key, enabled) VALUES ($1, 'tasks', true), ($2, 'tasks', true)`,
    [clientA, clientB]
  );
});

afterAll(async () => {
  await owner.query(`DELETE FROM audit_log WHERE entity_id IN ($1,$2,$3,$4,$5,$6)`, [
    docAId,
    docBId,
    referralAId,
    referralBId,
    clientA,
    clientB,
  ]).catch(() => {});
  await owner.query(`DELETE FROM documents WHERE id IN ($1,$2)`, [docAId, docBId]);
  await owner.query(`DELETE FROM referrals WHERE id IN ($1,$2)`, [referralAId, referralBId]);
  await owner.query(`DELETE FROM client_features WHERE client_id IN ($1,$2)`, [clientA, clientB]);
  await owner.query(`DELETE FROM companies WHERE id = $1`, [companyId]);
  await owner.query(`DELETE FROM clients WHERE id IN ($1,$2)`, [clientA, clientB]);
  await owner.end();
});

describe("Portal RLS: cross-client isolation (Phase 2 brief §5)", () => {
  it("a client cannot read another client's documents", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query("SELECT id FROM documents ORDER BY id");
      const ids = res.rows.map((r) => r.id);
      expect(ids).toContain(docAId);
      expect(ids).not.toContain(docBId);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a client cannot read another client's referrals", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query("SELECT id FROM referrals ORDER BY id");
      const ids = res.rows.map((r) => r.id);
      expect(ids).toContain(referralAId);
      expect(ids).not.toContain(referralBId);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a client cannot read another client's client_features rows", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query(
        "SELECT client_id FROM client_features WHERE client_id = $1",
        [clientB]
      );
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a client cannot reach any internal CRM table (companies)", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query("SELECT id FROM companies WHERE id = $1", [companyId]);
      expect(res.rows.length).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("a client session cannot insert a referral spoofing another client's client_id", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      await expect(
        client.query(
          `INSERT INTO referrals (client_id, referred_name) VALUES ($1, 'Spoofed referral')`,
          [clientB]
        )
      ).rejects.toThrow();
      await client.query("ROLLBACK").catch(() => {});
    } finally {
      await client.end();
    }
  });

  it("a client session can insert a referral scoped to its own client_id", async () => {
    const client = appClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      await setRlsContext(client, { role: "client", clientId: clientA });
      const res = await client.query(
        `INSERT INTO referrals (client_id, referred_name) VALUES ($1, 'Own referral') RETURNING id`,
        [clientA]
      );
      expect(res.rows.length).toBe(1);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});

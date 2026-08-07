import Link from "next/link";
import { listContractorRecords } from "@/lib/dal/contractors";
import { createContractorAction } from "./actions";

export default async function ContractorsPage() {
  const contractors = await listContractorRecords();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>Contractors</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        {contractors.map((c) => (
          <Link
            key={c.id}
            href={`/contractors/${c.id}`}
            className="gh-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
              {c.specialty ?? "—"}
            </span>
          </Link>
        ))}
        {contractors.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No contractors yet.</p>}
      </div>

      <details className="gh-card">
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add contractor</summary>
        <form action={createContractorAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
          <input className="gh-input" name="name" placeholder="Contractor name" required />
          <input className="gh-input" name="specialty" placeholder="Specialty / service category" />
          <button className="gh-btn-primary" type="submit">Add contractor</button>
        </form>
      </details>
    </div>
  );
}

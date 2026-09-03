import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/dal/companies";
import { getClientByCompanyId } from "@/lib/dal/clients";
import { createContactAction, deleteCompanyAction } from "../actions";
import { createDealAction } from "../../deals/actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, existingClient] = await Promise.all([getCompany(id), getClientByCompanyId(id)]);
  if (!data) notFound();
  const { company, contacts, deals } = data;
  const hasWonDeal = deals.some((d) => d.stage === "Won");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 800 }}>
      <div>
        <p className="gh-eyebrow">{company.source}</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          {company.name}
        </h1>
        <p style={{ color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>
          {company.industry ?? "—"} · {company.region ?? "—"} · {company.status}
        </p>
        <div style={{ display: "flex", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-3)" }}>
          {existingClient ? (
            <Link href={`/clients/${existingClient.id}`} className="gh-btn-primary">
              View client →
            </Link>
          ) : (
            hasWonDeal && (
              <Link href={`/clients/onboard?companyId=${company.id}`} className="gh-btn-primary">
                Onboard client
              </Link>
            )
          )}
          <form action={deleteCompanyAction.bind(null, company.id)}>
            <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">
              Remove company
            </SubmitButton>
          </form>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Deals</p>
        {deals.map((d) => (
          <Link key={d.id} href={`/deals/${d.id}`} className="gh-card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{d.stage}</span>
            <span>{d.valueNzd ? `$${d.valueNzd} NZD` : "—"}</span>
          </Link>
        ))}
        {deals.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No deals yet.</p>}
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>New deal</summary>
          <form action={createDealAction.bind(null, company.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="nextAction" placeholder="Next action (required)" required />
            <input className="gh-input" name="nextActionDate" type="date" required />
            <input className="gh-input" name="valueNzd" placeholder="Value (NZD)" />
            <input className="gh-input" name="packageTier" placeholder="Package tier" />
            <input className="gh-input" name="source" placeholder="Source" />
            <SubmitButton pendingLabel="Creating…">Create deal</SubmitButton>
          </form>
        </details>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Contacts</p>
        {contacts.map((c) => (
          <Link key={c.id} href={`/contacts/${c.id}`} className="gh-card" style={{ display: "block" }}>
            <p style={{ fontWeight: 500 }}>{c.firstName} {c.lastName}</p>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              {c.roleTitle ?? "—"} · {c.email ?? "—"} · {c.phone ?? "—"}
            </p>
          </Link>
        ))}
        {contacts.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No contacts yet.</p>}
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add contact</summary>
          <form action={createContactAction.bind(null, company.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <input className="gh-input" name="firstName" placeholder="First name" required />
            <input className="gh-input" name="lastName" placeholder="Last name" required />
            <input className="gh-input" name="roleTitle" placeholder="Role / title" />
            <input className="gh-input" name="email" placeholder="Email" />
            <input className="gh-input" name="phone" placeholder="Phone" />
            <SubmitButton pendingLabel="Adding…">Add contact</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}

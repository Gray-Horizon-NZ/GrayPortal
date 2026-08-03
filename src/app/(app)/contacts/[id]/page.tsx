import { notFound } from "next/navigation";
import Link from "next/link";
import { getContact } from "@/lib/dal/contacts";
import { getCompany } from "@/lib/dal/companies";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const companyData = await getCompany(contact.companyId);
  const relatedDeals = companyData?.deals.filter((d) => d.primaryContactId === contact.id) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">{contact.roleTitle ?? "Contact"}</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          {contact.firstName} {contact.lastName}
        </h1>
        {companyData && (
          <Link href={`/companies/${companyData.company.id}`} style={{ color: "var(--gh-text-muted)" }}>
            {companyData.company.name}
          </Link>
        )}
      </div>

      <section className="gh-card">
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Details</p>
        <p>{contact.email ?? "No email"}</p>
        <p>{contact.phone ?? "No phone"}</p>
        {contact.notes && <p style={{ marginTop: "var(--gh-space-2)" }}>{contact.notes}</p>}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Linked deals</p>
        {relatedDeals.map((d) => (
          <Link key={d.id} href={`/deals/${d.id}`} className="gh-card" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{d.stage}</span>
            <span>{d.valueNzd ? `$${d.valueNzd} NZD` : "—"}</span>
          </Link>
        ))}
        {relatedDeals.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No deals linked to this contact.</p>}
      </section>
    </div>
  );
}

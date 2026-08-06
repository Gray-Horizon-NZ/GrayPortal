import { notFound } from "next/navigation";
import Link from "next/link";
import { getContact } from "@/lib/dal/contacts";
import { getCompany } from "@/lib/dal/companies";
import { listEmailTemplates } from "@/lib/dal/emails";
import { logContactActivityAction, sendContactEmailAction } from "../actions";
import EmailComposeFields from "@/components/EmailComposeFields";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailSent?: string; emailError?: string }>;
}) {
  const { id } = await params;
  const { emailSent, emailError } = await searchParams;
  const data = await getContact(id);
  if (!data) notFound();
  const { contact, activities } = data;

  const companyData = await getCompany(contact.companyId);
  const relatedDeals = companyData?.deals.filter((d) => d.primaryContactId === contact.id) ?? [];
  const templates = await listEmailTemplates();

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

      {emailSent && <p style={{ color: "var(--gh-success)" }}>Email sent and logged.</p>}
      {emailError && <p style={{ color: "var(--gh-danger)" }}>Couldn&apos;t send: {emailError}</p>}

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

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Activity timeline</p>
        {activities
          .slice()
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
          .map((a) => (
            <div key={a.id} className="gh-card">
              <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
                {a.type} · {new Date(a.occurredAt).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}
              </p>
              <p>{a.body}</p>
            </div>
          ))}
        {activities.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No activity logged yet.</p>}
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Send email</summary>
          <form action={sendContactEmailAction.bind(null, contact.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <EmailComposeFields templates={templates} />
            <button className="gh-btn-primary" type="submit" disabled={!contact.email}>
              {contact.email ? "Send" : "No email on file"}
            </button>
          </form>
        </details>
        <details className="gh-card">
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log activity</summary>
          <form action={logContactActivityAction.bind(null, contact.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
            <select className="gh-input" name="type" defaultValue="note">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
            <textarea className="gh-input" name="body" placeholder="What happened" rows={3} />
            <input className="gh-input" name="outcome" placeholder="Outcome" />
            <button className="gh-btn-primary" type="submit">Log activity</button>
          </form>
        </details>
      </section>
    </div>
  );
}

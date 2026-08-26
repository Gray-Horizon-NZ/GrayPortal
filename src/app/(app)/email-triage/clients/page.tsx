import { redirect } from "next/navigation";
import Link from "next/link";
import { withCaller } from "@/lib/dal/auth";
import { listClientEmails } from "@/lib/dal/emails";
import { addContactEmailAliasAction } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";

// Every matched email whose contact belongs to an active client company, in
// one cross-client feed — "all client emails in one place," distinct from
// the Unmatched tab's triage queue. Each row's "+ add another address" form
// is what feeds contactEmailAliases (src/lib/dal/emails.ts) so a contact
// known to email from more than one inbox still lands here automatically
// next time, instead of back in Unmatched.
export default async function ClientEmailsPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const clientEmails = await listClientEmails();

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      {clientEmails.map((e) => (
        <div key={e.id} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p style={{ fontWeight: 500 }}>{e.subject || "(no subject)"}</p>
            <span style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
              {new Date(e.sentAt).toLocaleString("en-NZ")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>
              <Link href={`/clients/${e.clientId}`}>{e.clientName}</Link>
              {" — "}
              {e.contactFirstName} {e.contactLastName}
            </span>
            <span className="gh-badge">{e.direction}</span>
          </div>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>{e.snippet}</p>
          <details>
            <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              + Add another address for {e.contactFirstName}
            </summary>
            <form
              action={addContactEmailAliasAction.bind(null, e.contactId)}
              style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
            >
              <input className="gh-input" name="email" type="email" placeholder="another.address@example.com" required />
              <SubmitButton className="gh-btn-secondary" pendingLabel="Adding…">Add</SubmitButton>
            </form>
          </details>
        </div>
      ))}
      {clientEmails.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No matched client email yet.</p>}
    </section>
  );
}

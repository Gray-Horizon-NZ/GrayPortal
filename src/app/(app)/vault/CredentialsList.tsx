import { KeyRound, ExternalLink } from "lucide-react";
import { listCredentials } from "@/lib/dal/credentials";
import { createCredentialAction, rotateCredentialAction, softDeleteCredentialAction } from "./actions";
import RevealButton from "./RevealButton";
import SubmitButton from "@/components/ui/SubmitButton";

// Shared between /vault (clientId={null}, business-wide) and a client
// detail page's Credentials section (clientId={client.id}) — same masked
// list + reveal + add/rotate/remove shape either way, just scoped
// differently, so it isn't duplicated between the two pages.
export default async function CredentialsList({ clientId }: { clientId: string | null }) {
  const items = await listCredentials(clientId);

  return (
    <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
      <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>
        {clientId ? "Credentials" : "Business-wide credentials"}
      </p>

      {items.map((cred) => (
        <div
          key={cred.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--gh-space-3)",
            borderBottom: "1px solid var(--gh-border)",
            padding: "var(--gh-space-3) 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--gh-space-3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)" }}>
              <KeyRound size={14} strokeWidth={1.75} color="var(--gh-text-muted)" />
              {cred.label}
              {cred.username ? ` — ${cred.username}` : ""}
            </span>
            {cred.url && (
              <a
                href={cred.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-1)", color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}
              >
                Link <ExternalLink size={12} strokeWidth={1.75} />
              </a>
            )}
          </div>
          {cred.lastRotatedAt && (
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
              Rotated {new Date(cred.lastRotatedAt).toLocaleDateString("en-NZ")}
            </p>
          )}
          <RevealButton credentialId={cred.id} />
          <details>
            <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
              Rotate secret
            </summary>
            <form
              action={rotateCredentialAction.bind(null, cred.id, clientId)}
              style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
            >
              <input className="gh-input" name="secret" type="password" placeholder="New secret" required style={{ flex: 1 }} />
              <SubmitButton className="gh-btn-secondary">Rotate</SubmitButton>
            </form>
          </details>
          <form action={softDeleteCredentialAction.bind(null, cred.id, clientId)}>
            <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }}>
              Remove
            </SubmitButton>
          </form>
        </div>
      ))}
      {items.length === 0 && (
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No credentials stored yet.</p>
      )}

      <details className="gh-card" style={{ marginTop: "var(--gh-space-3)" }}>
        <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add credential</summary>
        <form
          action={createCredentialAction.bind(null, clientId)}
          style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
        >
          <input className="gh-input" name="label" placeholder="Label (e.g. Google Ads)" required />
          <input className="gh-input" name="username" placeholder="Username / email" />
          <input className="gh-input" name="secret" type="password" placeholder="Password / secret" required />
          <input className="gh-input" name="url" placeholder="URL (optional)" />
          <textarea className="gh-input" name="notes" placeholder="Notes" rows={2} />
          <SubmitButton>Add credential</SubmitButton>
        </form>
      </details>
    </section>
  );
}

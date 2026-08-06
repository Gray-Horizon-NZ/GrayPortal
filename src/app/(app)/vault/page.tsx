import { redirect } from "next/navigation";
import { withCaller } from "@/lib/dal/auth";
import { getMopStatus } from "@/lib/dal/mop";
import CredentialsList from "./CredentialsList";
import MopPanel from "./MopPanel";

export default async function VaultPage() {
  const caller = await withCaller(async (c) => c);
  if (caller.role !== "admin") redirect("/");

  const mopStatus = await getMopStatus();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Vault</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>Credentials</h1>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Business-wide secrets — internal tools, and eventually the Mobile Ops Package password. Per-client
          credentials live on each client&apos;s own page.
        </p>
      </div>
      <CredentialsList clientId={null} />

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Mobile Operations Package</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Encrypted bundle of everything needed to stand up Gray Horizon HQ on a new device. Static file,
          manually regenerated — not live/on-demand. The decryption password lives above as a business-wide
          credential.
        </p>
        <MopPanel status={mopStatus} />
      </section>
    </div>
  );
}

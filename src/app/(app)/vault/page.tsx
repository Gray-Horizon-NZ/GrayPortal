import { redirect } from "next/navigation";
import { ShieldCheck, Package } from "lucide-react";
import { getCaller } from "@/lib/dal/auth";
import { getMopStatus } from "@/lib/dal/mop";
import { PageHead, Panel } from "@/components/ui/terminal/Term";
import CredentialsList from "./CredentialsList";
import MopPanel from "./MopPanel";

export default async function VaultPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");

  const mopStatus = await getMopStatus();

  return (
    <div className="gh-term-page gh-animate-fade-up" style={{ maxWidth: 960 }}>
      <PageHead
        title="Vault"
        sub="Business-wide secrets — internal tools and the Mobile Ops Package password. Per-client credentials live on each client's own page."
      />

      <Panel title="Credentials" icon={ShieldCheck}>
        <CredentialsList clientId={null} />
      </Panel>

      <Panel title="Mobile Operations Package" icon={Package}>
        <p className="gh-term-muted" style={{ marginBottom: "var(--gh-space-4)" }}>
          Encrypted bundle of everything needed to stand up Gray Horizon HQ on a new device. Static file, manually
          regenerated — not live/on-demand. The decryption password lives above as a business-wide credential.
        </p>
        <MopPanel status={mopStatus} />
      </Panel>
    </div>
  );
}

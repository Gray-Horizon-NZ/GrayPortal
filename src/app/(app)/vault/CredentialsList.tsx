import { listCredentials } from "@/lib/dal/credentials";
import { CredentialsTable } from "@/terminal/screens/System";

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d) : "");

// Shared between /vault (clientId={null}, business-wide) and a client
// profile's Access tab (clientId={client.id}). Masked rows only — secrets
// are decrypted one at a time on reveal, after re-auth.
export default async function CredentialsList({ clientId }: { clientId: string | null }) {
  const items = await listCredentials(clientId);
  return (
    <CredentialsTable
      clientId={clientId}
      items={items.map((c) => ({ id: c.id, label: c.label, user: c.username ?? "", url: c.url ?? "", rotated: day(c.lastRotatedAt ?? c.createdAt) }))}
    />
  );
}

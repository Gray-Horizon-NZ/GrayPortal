import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { getMopStatus } from "@/lib/dal/mop";
import { listCredentials } from "@/lib/dal/credentials";
import { StoreData } from "@/terminal/store";
import { Vault } from "@/terminal/screens/System";

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d) : "");

// Business-wide secrets (internal tools, the Mobile Ops Package password).
// Per-client credentials live on each client's own page. Rendered by the
// terminal concept's Vault screen.
export default async function VaultPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const [mop, items] = await Promise.all([getMopStatus(), listCredentials(null)]);
  return (
    <StoreData
      data={{
        credentials: items.map((c) => ({ id: c.id, label: c.label, user: c.username ?? "", url: c.url ?? "", rotated: day(c.lastRotatedAt ?? c.createdAt) })),
        mop: mop ? { at: day(new Date(mop.generatedAt)) } : null,
      }}
    >
      <Vault />
    </StoreData>
  );
}

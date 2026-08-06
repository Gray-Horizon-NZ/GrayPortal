import { getPortalHome } from "@/lib/dal/portal";
import { paymentStatus } from "@/lib/paymentStatus";

export default async function PortalHomePage() {
  const { client, openTaskCount, enabledFeatureKeys } = await getPortalHome();
  const status = client ? paymentStatus(client.nextPaymentDate) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-12)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Welcome</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
          {client?.name ?? "Your account"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: "var(--gh-space-6)" }}>
        <div className="gh-card" style={{ flex: 1 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Next payment</p>
          {status ? (
            <span className="gh-badge" data-status={status.tone}>{status.label}</span>
          ) : (
            <p style={{ color: "var(--gh-text-muted)" }}>No upcoming payment on file.</p>
          )}
        </div>
        <div className="gh-card" style={{ flex: 1 }}>
          <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-2)" }}>Open tasks</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>{openTaskCount}</p>
        </div>
      </div>

      {enabledFeatureKeys.length === 0 && (
        <p style={{ color: "var(--gh-text-muted)" }}>
          No additional portal sections are enabled for your account yet.
        </p>
      )}
    </div>
  );
}

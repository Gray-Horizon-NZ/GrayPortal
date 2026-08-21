import { notFound } from "next/navigation";
import { getContractorRecord } from "@/lib/dal/contractors";
import { deleteContractorAction, inviteContractorAction } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inviteError?: string; invited?: string }>;
}) {
  const { id } = await params;
  const { inviteError, invited } = await searchParams;
  const data = await getContractorRecord(id);
  if (!data) notFound();
  const { contractor, portalUsers, assignedTasks } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Contractor</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>{contractor.name}</h1>
        {contractor.specialty && (
          <p style={{ color: "var(--gh-text-muted)", marginTop: "var(--gh-space-1)" }}>{contractor.specialty}</p>
        )}
        <form action={deleteContractorAction.bind(null, contractor.id)} style={{ marginTop: "var(--gh-space-3)" }}>
          <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">
            Remove contractor
          </SubmitButton>
        </form>
      </div>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">System access</p>
        {portalUsers.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{u.email}</span>
            <span style={{ color: "var(--gh-text-muted)" }}>{u.googleUid ? "Active" : "Invited — awaiting first sign-in"}</span>
          </div>
        ))}
        {portalUsers.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>No login invited yet.</p>
        )}
        {invited && <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>Invite sent.</p>}
        {inviteError && (
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>Couldn&apos;t invite: {inviteError}</p>
        )}
        {portalUsers.length === 0 && (
          <form action={inviteContractorAction.bind(null, contractor.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <input className="gh-input" name="email" type="email" placeholder="Contractor email" required />
            <input className="gh-input" name="displayName" placeholder="Display name (optional)" />
            <SubmitButton pendingLabel="Inviting…">Invite to system</SubmitButton>
          </form>
        )}
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Assigned tasks</p>
        {assignedTasks.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
            <span>{t.title}</span>
            <span className="gh-badge">{t.status.replace("_", " ")}</span>
          </div>
        ))}
        {assignedTasks.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>
            {portalUsers.length === 0 ? "No login yet, so nothing can be assigned." : "No tasks assigned yet."}
          </p>
        )}
      </section>
    </div>
  );
}

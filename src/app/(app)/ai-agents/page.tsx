import { listAiAgents } from "@/lib/dal/aiAgents";
import { createAiAgentAction, deleteAiAgentAction } from "./actions";
import AiAgentStatusSelect from "./AiAgentStatusSelect";
import SubmitButton from "@/components/ui/SubmitButton";

const COLUMNS = [
  { key: "active", label: "Active / Published" },
  { key: "in_dev", label: "In Development" },
  { key: "planned", label: "Planned / Ideated" },
] as const;

export default async function AiAgentsPage() {
  const agents = await listAiAgents();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)" }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>AI Agents</h1>
        <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)", marginTop: "var(--gh-space-2)" }}>
          Your own AI agent roadmap — never client- or contractor-visible.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(280px, 1fr))`,
          gap: "var(--gh-space-6)",
        }}
      >
        {COLUMNS.map(({ key, label }) => {
          const columnAgents = agents.filter((a) => a.status === key);
          return (
            <div key={key} className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
              <p className="gh-eyebrow">{label}</p>

              {columnAgents.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--gh-space-2)",
                    background: "var(--gh-surface-raised)",
                    border: "1px solid var(--gh-border-strong)",
                    borderRadius: "var(--gh-radius)",
                    padding: "var(--gh-space-3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--gh-space-2)" }}>
                    <span style={{ fontWeight: 500 }}>{a.title}</span>
                    <form action={deleteAiAgentAction.bind(null, a.id)}>
                      <SubmitButton className="gh-btn-secondary" style={{ color: "var(--gh-danger)" }} pendingLabel="Removing…">
                        Remove
                      </SubmitButton>
                    </form>
                  </div>
                  {a.description && (
                    <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>{a.description}</p>
                  )}
                  <AiAgentStatusSelect id={a.id} status={a.status} />
                </div>
              ))}
              {columnAgents.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No agents here yet.</p>
              )}

              <details>
                <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Add agent</summary>
                <form
                  action={createAiAgentAction}
                  style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}
                >
                  <input type="hidden" name="status" value={key} />
                  <input className="gh-input" name="title" placeholder="Agent name" required />
                  <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
                  <SubmitButton pendingLabel="Adding…">Add agent</SubmitButton>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

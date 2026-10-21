import { Bot } from "lucide-react";
import { listAiAgents } from "@/lib/dal/aiAgents";
import { createAiAgentAction, deleteAiAgentAction } from "./actions";
import AiAgentStatusSelect from "./AiAgentStatusSelect";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead } from "@/components/ui/terminal/Term";

const COLUMNS = [
  { key: "active", label: "Active / Published" },
  { key: "in_dev", label: "In Development" },
  { key: "planned", label: "Planned / Ideated" },
] as const;

export default async function AiAgentsPage() {
  const agents = await listAiAgents();

  return (
    <div className="gh-term-page">
      <PageHead title="AI agents" sub="Your own AI agent roadmap — never client- or contractor-visible." />

      <div className="gh-term-board">
        {COLUMNS.map(({ key, label }) => {
          const columnAgents = agents.filter((a) => a.status === key);
          return (
            <section key={key} className="gh-term-panel gh-term-bcol">
              <header className="gh-term-phead">
                <Bot size={13} strokeWidth={2} />
                <span className="gh-term-ptitle">{label}</span>
                <span className="gh-term-phead-r">{columnAgents.length}</span>
              </header>
              <div className="gh-term-bcol-body">
                {columnAgents.map((a) => (
                  <div key={a.id} className="gh-term-bcard">
                    <p className="gh-term-strong">{a.title}</p>
                    {a.description && <p className="gh-term-small">{a.description}</p>}
                    <div className="gh-term-bcard-foot">
                      <AiAgentStatusSelect id={a.id} status={a.status} />
                      <form action={deleteAiAgentAction.bind(null, a.id)}>
                        <SubmitButton className="gh-link-btn gh-link-btn--danger" pendingLabel="Removing…">
                          Remove
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
                {columnAgents.length === 0 && <p className="gh-term-muted">No agents here yet.</p>}
              </div>

              <details className="gh-term-bcol-add">
                <summary>+ Add agent</summary>
                <form action={createAiAgentAction} className="gh-term-form">
                  <input type="hidden" name="status" value={key} />
                  <input className="gh-input" name="title" placeholder="Agent name" required />
                  <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
                  <SubmitButton pendingLabel="Adding…">Add agent</SubmitButton>
                </form>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}

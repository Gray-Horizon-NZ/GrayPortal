import { listMyTasks } from "@/lib/dal/tasks";
import { listContractors } from "@/lib/dal/users";
import { withCaller } from "@/lib/dal/auth";
import TaskRow from "./TaskRow";

export default async function TasksPage() {
  const caller = await withCaller(async (c) => c);
  const [tasks, contractors] = await Promise.all([
    listMyTasks(),
    caller.role === "admin" ? listContractors() : Promise.resolve([]),
  ]);

  const ongoing = tasks.filter((t) => t.status === "ongoing");
  const active = tasks.filter((t) => t.status === "not_started" || t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 700 }}>
      <div>
        <p className="gh-eyebrow">Gray Horizon</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          Tasks
        </h1>
      </div>

      {ongoing.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Ongoing</p>
          {ongoing.map((t) => <TaskRow key={t.id} task={t} contractors={contractors} />)}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        <p className="gh-eyebrow">Active</p>
        {active.map((t) => <TaskRow key={t.id} task={t} contractors={contractors} />)}
        {active.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Nothing outstanding.</p>}
      </section>

      {done.length > 0 && (
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>
            Done ({done.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}>
            {done.map((t) => <TaskRow key={t.id} task={t} contractors={contractors} />)}
          </div>
        </details>
      )}
    </div>
  );
}

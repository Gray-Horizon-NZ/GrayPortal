import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalTasks } from "@/lib/dal/portal";
import HelpTooltip from "@/components/ui/HelpTooltip";

type PortalTask = Awaited<ReturnType<typeof listPortalTasks>>[number];

function TaskRow({ task }: { task: PortalTask }) {
  return (
    <div className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{task.title}</span>
      <span style={{ display: "flex", gap: "var(--gh-space-3)", alignItems: "center" }}>
        {task.dueDate && (
          <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            Due {task.dueDate}
          </span>
        )}
        <span className="gh-badge" data-status={task.status === "done" ? "success" : undefined}>
          {task.status.replace("_", " ")}
        </span>
      </span>
    </div>
  );
}

export default async function PortalTasksPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("tasks")) notFound();

  const tasks = await listPortalTasks();
  // "In progress" is the headline — it's the direct answer to "what is the
  // agency actively working on for me" — everything else (queued, ongoing,
  // done) is still visible but doesn't compete with it for attention.
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const upcoming = tasks.filter((t) => t.status === "not_started" || t.status === "ongoing");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-8)", maxWidth: 640 }}>
      <div>
        <p className="gh-eyebrow">Portal</p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)", display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          Tasks
          <HelpTooltip text="What Gray Horizon is actively working on for you, and what's coming up next." />
        </h1>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
        <p className="gh-eyebrow">Actively being worked on</p>
        {inProgress.map((t) => <TaskRow key={t.id} task={t} />)}
        {inProgress.length === 0 && (
          <p style={{ color: "var(--gh-text-muted)" }}>Nothing in progress right now.</p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
          <p className="gh-eyebrow">Upcoming</p>
          {upcoming.map((t) => <TaskRow key={t.id} task={t} />)}
        </section>
      )}

      {done.length > 0 && (
        <details>
          <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Done ({done.length})</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-3)" }}>
            {done.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        </details>
      )}

      {tasks.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tasks right now.</p>}
    </div>
  );
}

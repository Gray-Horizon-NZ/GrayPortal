import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { shortDate, todayNz } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { Head, Flash } from "@/components/contractor/ui";
import { setTaskStatusAction } from "../actions";

export default async function MyTasks({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const w = await getMyWorkspace();
  const today = todayNz();
  const open = w.tasks.filter((t) => t.status !== "done");
  const done = w.tasks.filter((t) => t.status === "done").slice(0, 15);

  const Row = ({ t }: { t: (typeof w.tasks)[number] }) => (
    <form action={setTaskStatusAction} className="gh-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--gh-space-3)", padding: "var(--gh-space-3) var(--gh-space-4)" }}>
      <input type="hidden" name="_back" value="/work/tasks" />
      <input type="hidden" name="id" value={t.id} />
      <input type="hidden" name="status" value={t.status === "done" ? "not_started" : "done"} />
      <span style={{ fontSize: "var(--gh-text-sm)", textDecoration: t.status === "done" ? "line-through" : undefined, color: t.status === "done" ? "var(--gh-text-muted)" : undefined }}>
        {t.title}
        {t.client_name ? <span style={{ color: "var(--gh-text-muted)" }}> · {t.client_name}</span> : null}
        {t.priority === "high" && t.status !== "done" ? <> <Badge status="danger">High</Badge></> : null}
      </span>
      <span style={{ display: "inline-flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
        {t.due_date && <Badge status={t.status !== "done" && t.due_date < today ? "danger" : "neutral"}>{shortDate(t.due_date)}</Badge>}
        <SubmitButton className="gh-btn-secondary" pendingLabel="…">
          {t.status === "done" ? "Reopen" : "Done"}
        </SubmitButton>
      </span>
    </form>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)", maxWidth: 900 }}>
      <Head eyebrow="Work" title={<>Tasks</>} lede="Tasks Max has assigned to you." />
      <Flash ok={ok} error={error} />
      {open.length === 0 ? <p style={{ color: "var(--gh-text-muted)" }}>Nothing outstanding.</p> : open.map((t) => <Row key={t.id} t={t} />)}
      {done.length > 0 && (
        <>
          <p className="gh-eyebrow" style={{ marginTop: "var(--gh-space-4)" }}>
            Recently done
          </p>
          {done.map((t) => (
            <Row key={t.id} t={t} />
          ))}
        </>
      )}
    </div>
  );
}

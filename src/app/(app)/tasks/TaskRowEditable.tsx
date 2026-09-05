import { Trash2 } from "lucide-react";
import TaskCheckRow from "./TaskCheckRow";
import SubmitButton from "@/components/ui/SubmitButton";
import EditTaskButton from "./EditTaskButton";
import { deleteTaskAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done" | "ongoing";
  dueDate: string | null;
  starred?: boolean;
  clientId?: string | null;
  internalList?: string | null;
  dealId?: string | null;
  dealCompanyName?: string | null;
  funnelStage?: "next" | "doing" | "done" | null;
};

type ClientOption = { id: string; name: string };
type InternalListOption = { key: string; label: string };

/**
 * TaskCheckRow (status/star) plus a popup edit and a delete button —
 * extracted from the block portal-preview's TaskListPreview.tsx had inline,
 * so Master Task View gets the same edit/delete it already had there. No
 * "use client" needed on this wrapper itself: it's just JSX with bound
 * Server Actions / child client components, same as everywhere else
 * admin-only mutation UI lives in this app. clientOptions/internalListOptions
 * are optional — passing them (Master Task View does) adds the "List"
 * picker to the edit popup; omitting them (portal-preview does) keeps it
 * to just name/date, since every task there already shares one client.
 */
export default function TaskRowEditable({
  task,
  clientId,
  clientOptions,
  internalListOptions,
}: {
  task: Task;
  clientId: string | null;
  clientOptions?: ClientOption[];
  internalListOptions?: InternalListOption[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
      <div style={{ flex: 1 }}>
        <TaskCheckRow task={task} />
      </div>
      <EditTaskButton
        task={{
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          clientId: task.clientId ?? null,
          internalList: task.internalList ?? null,
          dealId: task.dealId ?? null,
          dealCompanyName: task.dealCompanyName,
          funnelStage: task.funnelStage ?? null,
        }}
        clientId={clientId}
        clientOptions={clientOptions}
        internalListOptions={internalListOptions}
      />
      <form action={deleteTaskAction.bind(null, task.id, clientId)}>
        <SubmitButton
          className=""
          style={{
            background: "none",
            border: "none",
            padding: "var(--gh-space-1)",
            color: "var(--gh-danger)",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <Trash2 size={14} strokeWidth={1.75} aria-label="Remove task" />
        </SubmitButton>
      </form>
    </div>
  );
}

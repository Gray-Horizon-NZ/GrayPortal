"use client";
import { updateAiAgentStatusAction } from "./actions";

type Status = "planned" | "in_dev" | "active";

export default function AiAgentStatusSelect({ id, status }: { id: string; status: Status }) {
  return (
    <select
      className="gh-input"
      style={{ fontSize: "var(--gh-text-xs)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
      defaultValue={status}
      onChange={(e) => updateAiAgentStatusAction(id, e.target.value)}
    >
      <option value="planned">Planned / ideated</option>
      <option value="in_dev">In dev</option>
      <option value="active">Active / published</option>
    </select>
  );
}

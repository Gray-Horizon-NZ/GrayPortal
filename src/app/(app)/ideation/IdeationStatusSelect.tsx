"use client";
import { updateIdeationItemStatusAction } from "./actions";

type Status = "new" | "under_review" | "actioned" | "archived";

export default function IdeationStatusSelect({ id, status }: { id: string; status: Status }) {
  return (
    <select
      className="gh-input"
      style={{ fontSize: "var(--gh-text-xs)", padding: "var(--gh-space-1) var(--gh-space-2)" }}
      defaultValue={status}
      onChange={(e) => updateIdeationItemStatusAction(id, e.target.value)}
    >
      <option value="new">New</option>
      <option value="under_review">Under review</option>
      <option value="actioned">Actioned</option>
      <option value="archived">Archived</option>
    </select>
  );
}

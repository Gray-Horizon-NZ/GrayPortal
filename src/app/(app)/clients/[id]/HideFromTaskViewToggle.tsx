"use client";
import { setClientHiddenFromTaskViewAction } from "../actions";

export default function HideFromTaskViewToggle({ clientId, hidden }: { clientId: string; hidden: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
      <input
        type="checkbox"
        defaultChecked={hidden}
        onChange={(e) => setClientHiddenFromTaskViewAction(clientId, e.target.checked)}
      />
      <span style={{ fontSize: "var(--gh-text-sm)" }}>Hide from Master Task View</span>
    </label>
  );
}

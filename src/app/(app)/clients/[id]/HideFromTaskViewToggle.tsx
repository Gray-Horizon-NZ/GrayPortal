"use client";
import { setClientHiddenFromTaskViewAction } from "../actions";

export default function HideFromTaskViewToggle({ clientId, hidden }: { clientId: string; hidden: boolean }) {
  return (
    <div className="gh-toggle-row">
      <span>Hide from Master Task View</span>
      <label className="gh-switch">
        <input
          type="checkbox"
          defaultChecked={hidden}
          onChange={(e) => setClientHiddenFromTaskViewAction(clientId, e.target.checked)}
        />
        <span className="track" />
      </label>
    </div>
  );
}

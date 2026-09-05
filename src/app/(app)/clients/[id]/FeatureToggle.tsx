"use client";
import { toggleFeatureAction } from "../actions";
import type { PortalFeatureKey } from "@/lib/dal/clients";

export default function FeatureToggle({
  clientId,
  featureKey,
  enabled,
}: {
  clientId: string;
  featureKey: PortalFeatureKey;
  enabled: boolean;
}) {
  return (
    <div className="gh-toggle-row">
      <span style={{ textTransform: "capitalize" }}>{featureKey.replace("_", " ")}</span>
      <label className="gh-switch">
        <input
          type="checkbox"
          defaultChecked={enabled}
          onChange={(e) => toggleFeatureAction(clientId, featureKey, e.target.checked)}
        />
        <span className="track" />
      </label>
    </div>
  );
}

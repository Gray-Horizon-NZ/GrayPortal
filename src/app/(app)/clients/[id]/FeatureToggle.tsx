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
    <label style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-3)" }}>
      <input
        type="checkbox"
        defaultChecked={enabled}
        onChange={(e) => toggleFeatureAction(clientId, featureKey, e.target.checked)}
      />
      <span style={{ fontSize: "var(--gh-text-sm)" }}>{featureKey.replace("_", " ")}</span>
    </label>
  );
}

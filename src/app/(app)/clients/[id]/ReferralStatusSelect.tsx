"use client";
import { setReferralStatusAction, convertReferralAction } from "../actions";

type Status = "submitted" | "contacted" | "converted" | "discount_applied" | "declined";

export default function ReferralStatusSelect({
  referralId,
  clientId,
  status,
}: {
  referralId: string;
  clientId: string;
  status: Status;
}) {
  // "Converted" and "discount_applied" aren't reachable from this dropdown
  // — they're only ever set together by convertReferralAction, which also
  // applies the 20%-off-2-months rule automatically (brief §4). The select
  // only offers the states an admin can freely move between by hand.
  if (status === "converted" || status === "discount_applied") {
    return <span className="gh-badge" data-status="success">{status.replace("_", " ")}</span>;
  }
  return (
    <div style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center" }}>
      <select
        className="gh-input"
        defaultValue={status}
        onChange={(e) => setReferralStatusAction(referralId, clientId, e.target.value as Status)}
      >
        <option value="submitted">Submitted</option>
        <option value="contacted">Contacted</option>
        <option value="declined">Declined</option>
      </select>
      <button
        className="gh-btn-secondary"
        type="button"
        onClick={() => convertReferralAction(referralId, clientId)}
      >
        Mark converted
      </button>
    </div>
  );
}

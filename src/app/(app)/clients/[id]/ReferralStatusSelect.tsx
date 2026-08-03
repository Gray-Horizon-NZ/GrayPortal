"use client";
import { setReferralStatusAction } from "../actions";

type Status = "pending" | "confirmed" | "credited" | "declined";

export default function ReferralStatusSelect({
  referralId,
  clientId,
  status,
}: {
  referralId: string;
  clientId: string;
  status: Status;
}) {
  return (
    <select
      className="gh-input"
      defaultValue={status}
      onChange={(e) => setReferralStatusAction(referralId, clientId, e.target.value as Status)}
    >
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="credited">Credited</option>
      <option value="declined">Declined</option>
    </select>
  );
}

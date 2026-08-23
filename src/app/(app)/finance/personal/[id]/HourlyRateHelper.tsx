"use client";
import { useState } from "react";

/**
 * Amount input plus an optional rate×hours calculator — for "$33/hr" style
 * contractor payments where Max knows the rate and hours, not the total.
 * Renders the actual amountNzd input itself (still a plain named form
 * field, submits normally) so rate/hours can write into it; amount stays
 * directly editable too.
 */
export default function HourlyRateHelper() {
  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");

  function recompute(nextRate: string, nextHours: string) {
    const r = Number(nextRate);
    const h = Number(nextHours);
    if (nextRate && nextHours && !Number.isNaN(r) && !Number.isNaN(h)) {
      setAmount((r * h).toFixed(2));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
      <div style={{ display: "flex", gap: "var(--gh-space-2)" }}>
        <input
          className="gh-input"
          placeholder="Rate/hr (optional)"
          value={rate}
          onChange={(e) => {
            setRate(e.target.value);
            recompute(e.target.value, hours);
          }}
          style={{ flex: 1 }}
        />
        <input
          className="gh-input"
          placeholder="Hours"
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            recompute(rate, e.target.value);
          }}
          style={{ flex: 1 }}
        />
      </div>
      <input
        className="gh-input"
        name="amountNzd"
        placeholder="Amount (NZD)"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
    </div>
  );
}

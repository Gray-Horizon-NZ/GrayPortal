"use client";
import { useEffect, useState } from "react";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Candidate } from "@/lib/incrementum/compute";

const STAGE_LABEL: Record<string, string> = {
  sourced: "Sourced",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  vetting: "Vetting",
  confirmed: "Confirmed",
  onboarded: "Gray Horizon Team",
  paused: "Paused",
};

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const money = (n: number | null) => (n === null ? "—" : nzd.format(n));

/**
 * The "Assign" popup (Max, 2026-10-18): every contractor who can fulfil this
 * need, with their quoted rate, capacity and the estimated sell price at the
 * current markup. Assigning snapshots the rate onto the need; a typed rate
 * overrides their quote (or covers a skill match who hasn't quoted yet).
 */
export default function AssignDialog({
  action,
  needId,
  back,
  serviceName,
  candidates,
  assignedId,
  markup,
}: {
  action: (fd: FormData) => Promise<void>;
  needId: string;
  back: string;
  serviceName: string;
  candidates: Candidate[];
  assignedId: string | null;
  markup: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={assignedId ? "gh-btn-secondary" : "gh-btn-primary"} onClick={() => setOpen(true)}>
        {assignedId ? "Reassign" : "Assign"}
      </button>
      {open && (
        <div className="gh-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="gh-modal gh-modal--wide" role="dialog" aria-modal="true" aria-label={`Assign a contractor to ${serviceName}`} onClick={(e) => e.stopPropagation()}>
            <div className="inc-cell-head" style={{ marginBottom: "var(--gh-space-4)" }}>
              <div>
                <p className="gh-eyebrow">Assign a contractor</p>
                <h2 className="inc-cell-title">{serviceName}</h2>
                <p className="inc-small">Est. price = their rate × (1 + {markup}% markup). You can still adjust it on the quote afterwards.</p>
              </div>
              <button type="button" className="gh-link-btn" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            {candidates.length === 0 ? (
              <p className="inc-muted">
                Nobody can fulfil this yet. Add the service to a contractor&apos;s quotes on their profile, or give them a matching skill tag.
              </p>
            ) : (
              <div className="inc-list">
                {candidates.map((c) => {
                  const free = c.capacitySlots !== null ? Math.max(0, c.capacitySlots - c.slotsUsed) : null;
                  return (
                    <form action={action} key={c.contractorId} className="inc-row" style={{ flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="_back" value={back} />
                      <input type="hidden" name="id" value={needId} />
                      <input type="hidden" name="contractorId" value={c.contractorId} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 220px", minWidth: 0 }}>
                        <strong style={{ fontWeight: 500 }}>
                          {c.name}
                          {c.contractorId === assignedId ? " · assigned" : ""}
                        </strong>
                        <span className="inc-small">
                          {STAGE_LABEL[c.stage] ?? c.stage}
                          {c.match === "skills" ? ` · skill match (${c.matchedTags.join(", ")}), no quote yet` : ""}
                          {c.quality ? ` · quality ${c.quality}/5` : ""}
                          {free !== null ? ` · ${free} slot${free === 1 ? "" : "s"} free` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span className="inc-num" style={{ fontSize: "var(--gh-text-sm)" }}>
                          {c.rate !== null ? `${money(c.rate)}/${c.rateType === "monthly" ? "mo" : c.rateType}` : "No rate"}
                        </span>
                        <span className="inc-small">est. sell {money(c.estUnitPrice)}</span>
                      </div>
                      <input className="gh-input" name="rate" placeholder={c.rate !== null ? "Rate (optional)" : "Rate required"} required={c.rate === null} inputMode="decimal" style={{ width: 120 }} aria-label="Rate override" />
                      <SubmitButton pendingLabel="Assigning…" className={c.onBench ? "gh-btn-primary" : "gh-btn-secondary"}>
                        Assign
                      </SubmitButton>
                    </form>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

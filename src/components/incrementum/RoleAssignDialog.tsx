"use client";
import { useEffect, useState } from "react";
import SubmitButton from "@/components/ui/SubmitButton";
import type { RoleCandidate } from "@/lib/incrementum/compute";

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
const money = (n: number) => nzd.format(n);

export type ContractorPreview = {
  monthlyPrice: number;
  monthlyProfit: number;
  oneOffPrice: number;
  marginPct: number | null;
  roleMonthlyPrice: number;
  roleMonthlyProfit: number;
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/**
 * "Add contractor" for one role on a profile (Max, 2026-10-21): every
 * contractor who covers the role (or has quoted one of its services), with
 * what they'd charge for this client's lines and how many jobs they already
 * have, then a green ADD. Adding assigns them to every line in the role.
 * Each row also previews the result: what the client would pay per month
 * and your profit with that contractor, so a $400 and a $700 contractor
 * compare at a glance.
 */
export default function RoleAssignDialog({
  action,
  roleId,
  roleName,
  leadId,
  engagementId,
  back,
  candidates,
  previews = {},
  passLine = 700,
  hiddenForSize = 0,
  sizeLabel = null,
  assignedId,
}: {
  action: (fd: FormData) => Promise<void>;
  roleId: string | null;
  roleName: string;
  leadId?: string;
  engagementId?: string;
  back: string;
  candidates: RoleCandidate[];
  /** What the profile comes to if each contractor is added (previewRole). */
  previews?: Record<string, ContractorPreview>;
  passLine?: number;
  /** Contractors left out because they don't take jobs this size. */
  hiddenForSize?: number;
  sizeLabel?: string | null;
  assignedId: string | null;
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
      <button type="button" className={assignedId ? "gh-link-btn" : "gh-btn-primary"} onClick={() => setOpen(true)}>
        {assignedId ? "Change" : "Add contractor"}
      </button>
      {open && (
        <div className="gh-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="gh-modal gh-modal--wide" role="dialog" aria-modal="true" aria-label={`Add a contractor for ${roleName}`} onClick={(e) => e.stopPropagation()}>
            <div className="inc-cell-head" style={{ marginBottom: "var(--gh-space-4)" }}>
              <div>
                <p className="gh-eyebrow">Add contractor</p>
                <h2 className="inc-cell-title">{roleName}</h2>
                <p className="inc-small">
                  &quot;Their rate&quot; is their quote for this client&apos;s {roleName.toLowerCase()} lines. &quot;If added&quot; is the whole profile&apos;s monthly retainer, your profit and setup with them. You can adjust any line afterwards.
                </p>
                {sizeLabel && (
                  <p className="inc-small">
                    {sizeLabel} job · showing contractors who work with this size
                    {hiddenForSize > 0 ? ` (${hiddenForSize} hidden who don't)` : ""}.
                  </p>
                )}
              </div>
              <button type="button" className="gh-link-btn" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            {candidates.length === 0 ? (
              <p className="inc-muted">
                {hiddenForSize > 0
                  ? `Nobody who covers this role works with ${sizeLabel?.toLowerCase() ?? "this size of business"} yet. Tick it under "Works with" on a contractor's profile.`
                  : `Nobody covers this role yet. Tick "${roleName}" under Roles on a contractor's profile, or add their quote for one of these services.`}
              </p>
            ) : (
              <div className="inc-list">
                {candidates.map((c) => {
                  const assigned = c.contractorId === assignedId;
                  const quoted = c.lines.filter((l) => l.rate !== null);
                  return (
                    <form
                      action={async (fd) => {
                        await action(fd);
                        setOpen(false);
                      }}
                      key={c.contractorId}
                      className="inc-pick"
                    >
                      <input type="hidden" name="_back" value={back} />
                      {leadId && <input type="hidden" name="leadId" value={leadId} />}
                      {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
                      {roleId && <input type="hidden" name="roleId" value={roleId} />}
                      <input type="hidden" name="contractorId" value={c.contractorId} />
                      <span className="inc-avatar" style={{ width: 40, height: 40 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.photoUrl ? <img src={c.photoUrl} alt="" /> : initials(c.name)}
                      </span>
                      <div className="inc-pick-main">
                        <strong>{c.name}</strong>
                        <span className="inc-small">
                          {STAGE_LABEL[c.stage] ?? c.stage}
                          {c.quality ? ` · quality ${c.quality}/5` : ""}
                          {!c.roleMatch ? " · quoted, role not ticked" : ""}
                        </span>
                        {quoted.length > 0 && <span className="inc-small">{quoted.map((l) => `${l.name} ${money(l.rate!)}`).join(" · ")}</span>}
                        {c.missingQuotes > 0 && (
                          <span className="inc-small" style={{ color: "var(--gh-warning)" }}>
                            No quote for {c.lines.filter((l) => l.rate === null).map((l) => l.name).join(", ")} (uses the expected quote)
                          </span>
                        )}
                      </div>
                      <div className="inc-pick-price">
                        <span className="inc-small">Their rate</span>
                        <span className="inc-num">{c.monthlyRate ? `${money(c.monthlyRate)}/mo` : quoted.length ? "—" : "No quotes"}</span>
                        {c.oneOffRate > 0 && <span className="inc-small">+ {money(c.oneOffRate)} one-off</span>}
                      </div>
                      {previews[c.contractorId] && (
                        <div className="inc-pick-price inc-pick-preview">
                          <span className="inc-small">If added</span>
                          <span className="inc-num">{money(previews[c.contractorId].monthlyPrice)}/mo</span>
                          <span
                            className="inc-small"
                            style={{ color: previews[c.contractorId].monthlyProfit < passLine ? "var(--gh-danger)" : "var(--gh-success)", fontWeight: 500 }}
                          >
                            profit {money(previews[c.contractorId].monthlyProfit)}
                            {previews[c.contractorId].marginPct !== null ? ` · ${previews[c.contractorId].marginPct}%` : ""}
                          </span>
                          {previews[c.contractorId].oneOffPrice > 0 && <span className="inc-small">setup {money(previews[c.contractorId].oneOffPrice)}</span>}
                        </div>
                      )}
                      <div className="inc-pick-jobs">
                        <span className="inc-num">{c.jobs}</span>
                        <span className="inc-small">job{c.jobs === 1 ? "" : "s"}</span>
                      </div>
                      {assigned ? (
                        <span className="inc-chip" data-tone="good">
                          Added
                        </span>
                      ) : (
                        <SubmitButton className="inc-btn-add" pendingLabel="…">
                          ADD
                        </SubmitButton>
                      )}
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

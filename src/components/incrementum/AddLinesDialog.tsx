"use client";
import { useEffect, useState } from "react";
import SubmitButton from "@/components/ui/SubmitButton";

export type AddablePackage = { id: string; name: string; status: string; monthlyPrice: number; setupPrice: number; lines: string[] };
export type AddableService = { id: string; name: string; billing: string; price: number | null; roleName: string | null };
export type AddableCatalogueItem = { id: string; moduleCode: string; deliverable: string; price: string };

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const money = (n: number | null) => (n === null ? "—" : nzd.format(n));

type Tab = "packages" | "services" | "catalogue";

/**
 * "+ Add package / service" on a lead or client profile (Max, 2026-10-21).
 * Packages copy their services in as editable lines; Services adds one
 * Incrementum service; Something else picks any GrayPortal catalogue item
 * as an off-list line on this client only. The popup stays open after each
 * ADD, so several can be added in one go.
 */
export default function AddLinesDialog({
  action,
  packageAction,
  leadId,
  engagementId,
  back,
  packages,
  services,
  catalogue,
  roles,
  added,
  primary = false,
}: {
  action: (fd: FormData) => Promise<void>;
  packageAction: (fd: FormData) => Promise<void>;
  leadId?: string;
  engagementId?: string;
  back: string;
  packages: AddablePackage[];
  services: AddableService[];
  catalogue: AddableCatalogueItem[];
  roles: { id: string; name: string }[];
  /** Service ids / catalogue ids / package ids already on the profile. */
  added: string[];
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("packages");
  const [query, setQuery] = useState("");
  const onProfile = new Set(added);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const q = query.trim().toLowerCase();
  const scope = (
    <>
      <input type="hidden" name="_back" value={back} />
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
    </>
  );
  const addedChip = (id: string) =>
    onProfile.has(id) ? (
      <span className="inc-chip" data-tone="good">
        On profile
      </span>
    ) : null;

  return (
    <>
      <button type="button" className={primary ? "gh-btn-primary" : "gh-btn-secondary"} onClick={() => setOpen(true)}>
        + Add package / service
      </button>
      {open && (
        <div className="gh-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="gh-modal gh-modal--wide" role="dialog" aria-modal="true" aria-label="Add a package or service" onClick={(e) => e.stopPropagation()}>
            <div className="inc-cell-head" style={{ marginBottom: "var(--gh-space-4)" }}>
              <div>
                <p className="gh-eyebrow">Add to profile</p>
                <h2 className="inc-cell-title">
                  Package or <em>service</em>
                </h2>
              </div>
              <button type="button" className="gh-link-btn" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="inc-tabs" role="tablist">
              {(
                [
                  ["packages", "Packages"],
                  ["services", "Services"],
                  ["catalogue", "Something else"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className="inc-tabs-btn" data-active={tab === key || undefined} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab !== "packages" && (
              <input className="gh-input" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" style={{ marginBottom: "var(--gh-space-3)" }} />
            )}

            {tab === "packages" && (
              <div className="inc-list">
                {packages.length === 0 && <p className="inc-muted">No packages yet. Build them in Services &amp; Pricing.</p>}
                {packages.map((p) => (
                  <form action={packageAction} key={p.id} className="inc-pick">
                    {scope}
                    <input type="hidden" name="packageId" value={p.id} />
                    <div className="inc-pick-main">
                      <strong>
                        {p.name} {p.status !== "live" && <span className="inc-chip">{p.status}</span>} {addedChip(p.id)}
                      </strong>
                      <span className="inc-small">{p.lines.join(" · ")}</span>
                    </div>
                    <div className="inc-pick-price">
                      <span className="inc-num">{money(p.monthlyPrice)}/mo</span>
                      {p.setupPrice > 0 && <span className="inc-small">+ {money(p.setupPrice)} setup</span>}
                    </div>
                    <SubmitButton className="inc-btn-add" pendingLabel="…">
                      ADD
                    </SubmitButton>
                  </form>
                ))}
              </div>
            )}

            {tab === "services" && (
              <div className="inc-list">
                {services
                  .filter((sv) => !q || sv.name.toLowerCase().includes(q))
                  .map((sv) => (
                    <form action={action} key={sv.id} className="inc-pick">
                      {scope}
                      <input type="hidden" name="serviceId" value={sv.id} />
                      <div className="inc-pick-main">
                        <strong>
                          {sv.name} {addedChip(sv.id)}
                        </strong>
                        <span className="inc-small">
                          {sv.billing} · {sv.roleName ?? "no contractor role"}
                        </span>
                      </div>
                      <div className="inc-pick-price">
                        <span className="inc-num">{money(sv.price)}</span>
                      </div>
                      <SubmitButton className="inc-btn-add" pendingLabel="…">
                        ADD
                      </SubmitButton>
                    </form>
                  ))}
              </div>
            )}

            {tab === "catalogue" && (
              <>
                <p className="inc-small" style={{ marginBottom: "var(--gh-space-3)" }}>
                  Anything from the GrayPortal products &amp; services catalogue, on this client only, at its catalogue price. Pick who delivers it so it lands under the right contractor.
                </p>
                <div className="inc-list">
                  {catalogue
                    .filter((c) => !q || `${c.moduleCode} ${c.deliverable}`.toLowerCase().includes(q))
                    .map((c) => (
                      <form action={action} key={c.id} className="inc-pick">
                        {scope}
                        <input type="hidden" name="serviceItemId" value={c.id} />
                        <div className="inc-pick-main">
                          <strong>
                            {c.deliverable} {addedChip(c.id)}
                          </strong>
                          <span className="inc-small">
                            {c.moduleCode} · {c.price}
                          </span>
                        </div>
                        <select className="gh-input" name="roleId" defaultValue="" aria-label="Delivered by" style={{ width: 170 }}>
                          <option value="">No contractor</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="inc-btn-add" pendingLabel="…">
                          ADD
                        </SubmitButton>
                      </form>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// "Services & team" — what a lead or client is getting and who delivers it
// (Max, 2026-10-21; replaces the single-list quote builder). The profile
// starts empty: "+ Add package / service" copies in a package, adds a
// service, or an off-list catalogue item. Lines group by contractor role
// (Ads specialist, Website contractor…) with one "Add contractor" per role.
// Every number stays adjustable per line; totals recalculate from the lines.
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { computeNeed, quoteTotals, roleGroups, roleCandidates } from "@/lib/incrementum/compute";
import { money } from "@/lib/incrementum/format";
import { clientsForTarget, toNum } from "@/lib/incrementum/pricing";
import { SERVICE_BILLING_LABELS } from "@/lib/incrementum/registry";
import SubmitButton from "@/components/ui/SubmitButton";
import AddLinesDialog from "./AddLinesDialog";
import RoleAssignDialog from "./RoleAssignDialog";
import { Avatar, Chip } from "./ui";
import {
  createNeedAction,
  addPackageLinesAction,
  updateNeedAction,
  setNeedWaivedAction,
  assignRoleAction,
  unassignRoleAction,
  deleteNeedAction,
} from "@/app/(incrementum)/incrementum/actions";

const PRICE_SOURCE: Record<string, string> = {
  override: "your price",
  cost_plus: "rate + markup",
  catalogue_floor: "raised to catalogue",
  service: "service price (no rate yet)",
  catalogue: "catalogue price",
  none: "no price yet",
};

export default function ClientServices({
  s,
  leadId,
  engagementId,
  back,
  readOnly = false,
}: {
  s: IncrementumSnapshot;
  leadId?: string;
  engagementId?: string;
  back: string;
  readOnly?: boolean;
}) {
  const rows = s.state.needs.filter((n) => (engagementId ? n.engagementId === engagementId : n.leadId === leadId && !n.engagementId));
  const views = rows.map((n) => computeNeed(s.state, s.services, n));
  const t = quoteTotals(views);
  const groups = roleGroups(s.state, views);
  const freedom = toNum(s.state.settings.freedomTarget) ?? 10000;
  const roles = s.state.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? null;
  const scope = (
    <>
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
    </>
  );
  const lineBack = `${back}#quote`;

  const addDialog = (primary: boolean) => (
    <AddLinesDialog
      action={createNeedAction}
      packageAction={addPackageLinesAction}
      leadId={leadId}
      engagementId={engagementId}
      back={lineBack}
      primary={primary}
      roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      added={[...rows.map((r) => r.serviceId ?? r.serviceItemId ?? ""), ...rows.map((r) => r.packageId ?? "")].filter(Boolean)}
      packages={s.packages
        .filter((p) => p.status !== "retired")
        .map((p) => ({ id: p.id, name: p.name, status: p.status, monthlyPrice: p.totals.monthlyPrice, setupPrice: p.totals.setupPrice, lines: p.lines.map((l) => l.name) }))}
      services={s.services
        .filter((x) => x.status === "active")
        .map((x) => ({
          id: x.id,
          name: x.name,
          billing: SERVICE_BILLING_LABELS[x.billing as keyof typeof SERVICE_BILLING_LABELS] ?? x.billing,
          price: x.price.sellPrice,
          roleName: roleName(x.roleId),
        }))}
      catalogue={[...s.state.catalogue]
        .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode) || a.deliverable.localeCompare(b.deliverable))
        .map((c) => ({
          id: c.id,
          moduleCode: c.moduleCode,
          deliverable: c.deliverable,
          price: c.isRecurring && c.currentMonthlyPrice ? `${money(toNum(c.currentMonthlyPrice))}/mo` : c.currentSetupPrice ? money(toNum(c.currentSetupPrice)) : (c.priceText ?? "No price"),
        }))}
    />
  );

  return (
    <section className="inc-panel" id="quote" style={{ borderColor: "var(--gh-accent)" }}>
      <div className="inc-cell-head">
        <div>
          <p className="gh-eyebrow">{engagementId ? "Live client" : "Quote"}</p>
          <h2 className="inc-cell-title">
            Services &amp; <em>team</em>
          </h2>
        </div>
        <span className="inc-inline">
          {t.unassigned > 0 && <Chip tone="warning">{t.unassigned} without a contractor</Chip>}
          {!readOnly && views.length > 0 && addDialog(false)}
        </span>
      </div>

      {views.length === 0 ? (
        <div className="inc-empty">
          <p className="inc-muted">Nothing on this profile yet. Add a package, pick services one by one, or anything else from the GrayPortal catalogue.</p>
          {!readOnly && addDialog(true)}
        </div>
      ) : (
        <>
          <div className="inc-stats">
            <div className="inc-stat">
              <span className="inc-small">Monthly price</span>
              <span className="inc-stat-value">{money(t.monthlyPrice)}</span>
              <span className="inc-small">{t.monthlyDiscount ? `bundle −${money(t.monthlyDiscount)} off ${money(t.monthlySubtotal)}` : ""}</span>
            </div>
            <div className="inc-stat">
              <span className="inc-small">Contractor cost</span>
              <span className="inc-stat-value">{money(t.monthlyCost)}</span>
            </div>
            <div className="inc-stat">
              <span className="inc-small">Your profit / mo</span>
              <span
                className="inc-stat-value"
                style={{ color: t.monthlyProfit < 400 && t.monthlyPrice > 0 ? "var(--gh-danger)" : t.monthlyProfit >= 700 ? "var(--gh-success)" : undefined }}
              >
                {money(t.monthlyProfit)}
              </span>
              <span className="inc-small">{t.marginPct !== null ? `${t.marginPct}% margin` : ""}</span>
            </div>
            <div className="inc-stat">
              <span className="inc-small">One-off / setup</span>
              <span className="inc-stat-value">{money(t.oneOffPrice)}</span>
              <span className="inc-small">
                cost {money(t.oneOffCost)}
                {t.waivedValue ? ` · ${money(t.waivedValue)} waived` : ""}
              </span>
            </div>
            <div className="inc-stat">
              <span className="inc-small">Clients like this for {money(freedom)}</span>
              <span className="inc-stat-value">{clientsForTarget(freedom, t.monthlyProfit) ?? "—"}</span>
            </div>
          </div>

          {groups.map((g) => {
            const candidates = roleCandidates(s.state, g);
            const groupCost = g.lines.reduce((a, l) => a + (l.billing === "monthly" ? (l.cost ?? 0) : 0), 0);
            const profile = g.contractorId ? s.state.profiles.find((p) => p.contractorId === g.contractorId) : null;
            return (
              <div className="inc-role" key={g.roleId ?? "none"}>
                <div className="inc-role-head">
                  <div className="inc-role-title">
                    <p className="inc-role-label">{g.roleName}</p>
                    <span className="inc-small">
                      {g.lines.length} line{g.lines.length === 1 ? "" : "s"}
                      {groupCost ? ` · ${money(groupCost)}/mo contractor cost` : ""}
                      {g.roleId === null ? " · set a role on the service in Services & Pricing, or leave it for work you do yourself" : ""}
                    </span>
                  </div>
                  <div className="inc-inline">
                    {g.contractorId ? (
                      <span className="inc-role-who">
                        <Avatar name={g.contractorName ?? "?"} photoUrl={profile?.photoUrl} size={32} />
                        <a className="inc-link" href={`/incrementum/contractors/${g.contractorId}`} style={{ textTransform: "none", letterSpacing: 0, fontSize: "var(--gh-text-sm)" }}>
                          {g.contractorName}
                        </a>
                      </span>
                    ) : g.assignedCount > 0 ? (
                      <Chip tone="warning">
                        {g.assignedCount}/{g.lines.length} assigned
                      </Chip>
                    ) : null}
                    {!readOnly && (
                      <>
                        <RoleAssignDialog
                          action={assignRoleAction}
                          roleId={g.roleId}
                          roleName={g.roleName}
                          leadId={leadId}
                          engagementId={engagementId}
                          back={lineBack}
                          candidates={candidates}
                          assignedId={g.contractorId}
                        />
                        {g.assignedCount > 0 && (
                          <form action={unassignRoleAction}>
                            <input type="hidden" name="_back" value={lineBack} />
                            {scope}
                            {g.roleId && <input type="hidden" name="roleId" value={g.roleId} />}
                            <SubmitButton className="gh-link-btn" pendingLabel="…">
                              Remove
                            </SubmitButton>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="inc-list">
                  {g.lines.map((n) => (
                    <div key={n.id} className="inc-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "var(--gh-space-2)" }}>
                      <div className="inc-inline" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span className="inc-inline">
                            <strong style={{ fontWeight: 500, textDecoration: n.waived ? "line-through" : undefined }}>
                              {n.name}
                              {n.title && n.title !== n.name ? <span className="inc-muted"> · {n.title}</span> : null}
                              {toNum(n.quantity) !== 1 ? <span className="inc-muted"> × {n.quantity}</span> : null}
                            </strong>
                            <Chip>{n.billing === "monthly" ? "monthly" : "one-off"}</Chip>
                            {n.packageName && <Chip tone="accent">{n.packageName}</Chip>}
                            {n.serviceItemId && <Chip>off-list</Chip>}
                          </span>
                          <span className="inc-small">
                            {n.contractorName ? `${n.contractorName} at ${money(n.rate)}` : n.rate !== null ? `est. quote ${money(n.rate)}` : "no contractor rate"} · {n.markup}% markup ·{" "}
                            {PRICE_SOURCE[n.priceSource]}
                          </span>
                        </div>
                        <div className="inc-inline" style={{ flexWrap: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <span className="inc-num" style={{ fontWeight: 500 }}>
                              {n.waived ? "Waived" : `${money(n.price)}${n.billing === "monthly" ? "/mo" : ""}`}
                            </span>
                            <span className="inc-small">profit {money(n.profit)}</span>
                          </div>
                          {!readOnly && n.billing !== "monthly" && (
                            <form action={setNeedWaivedAction}>
                              <input type="hidden" name="_back" value={lineBack} />
                              <input type="hidden" name="id" value={n.id} />
                              <input type="hidden" name="waived" value={n.waived ? "" : "on"} />
                              <SubmitButton className="gh-link-btn" pendingLabel="…">
                                {n.waived ? "Charge" : "Waive"}
                              </SubmitButton>
                            </form>
                          )}
                          {!readOnly && (
                            <form action={deleteNeedAction}>
                              <input type="hidden" name="_back" value={lineBack} />
                              <input type="hidden" name="id" value={n.id} />
                              <SubmitButton className="gh-link-btn" pendingLabel="…" ariaLabel={`Remove ${n.name}`}>
                                ×
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                      {!readOnly && (
                        <details className="inc-disclosure">
                          <summary>Adjust</summary>
                          <form action={updateNeedAction} className="inc-form">
                            <input type="hidden" name="_back" value={lineBack} />
                            <input type="hidden" name="id" value={n.id} />
                            <label className="inc-field">
                              Contractor rate ($)
                              <input className="gh-input" name="contractorRate" defaultValue={n.contractorRate ?? ""} inputMode="decimal" disabled={!n.contractorId} />
                            </label>
                            <label className="inc-field">
                              Markup % (blank = {n.service?.effectiveMarkupPct ?? 33}%)
                              <input className="gh-input" name="markupPct" defaultValue={n.markupPct ?? ""} inputMode="decimal" />
                            </label>
                            <label className="inc-field">
                              Your price ($, per unit)
                              <input className="gh-input" name="sellPrice" defaultValue={n.sellPrice ?? ""} inputMode="decimal" placeholder={n.unitPrice !== null ? String(n.unitPrice) : ""} />
                            </label>
                            <label className="inc-field">
                              Quantity
                              <input className="gh-input" name="quantity" defaultValue={n.quantity} inputMode="decimal" />
                            </label>
                            <label className="inc-field">
                              Detail
                              <input className="gh-input" name="title" defaultValue={n.title ?? ""} placeholder="e.g. 2 locations, Shopify store" />
                            </label>
                            <label className="inc-field">
                              Tags
                              <input className="gh-input" name="tags" defaultValue={(n.tags ?? []).join(", ")} />
                            </label>
                            <label className="inc-field inc-field--wide">
                              Notes
                              <input className="gh-input" name="notes" defaultValue={n.notes ?? ""} />
                            </label>
                            {!n.contractorId && <input type="hidden" name="contractorRate" value="" />}
                            <SubmitButton pendingLabel="Saving…">Save line</SubmitButton>
                          </form>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
      {engagementId && (
        <p className="inc-small">
          On a live client, adding a contractor to a role also updates the engagement&apos;s contractor team and monthly costs. The signed price only changes when you edit it in Details.
        </p>
      )}
    </section>
  );
}

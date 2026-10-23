// "Services & team": what a lead or client is getting and who delivers it
// (Max, 2026-10-21), in the concept's layout (parts.jsx ServicesTeam). The
// profile starts empty; "Add package / service" copies in a package, adds a
// service, or an off-list catalogue item. Lines group by contractor role with
// one "Add contractor" per role. Every number stays adjustable per line.
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { computeNeed, quoteTotals, roleGroups, roleCandidates, previewRole, type NeedView, type RoleGroup } from "@/lib/incrementum/compute";
import { money } from "@/lib/incrementum/format";
import { clientsForTarget, toNum } from "@/lib/incrementum/pricing";
import { BUSINESS_SIZE_LABELS, CONTRACTOR_STAGE_LABELS, type BusinessSize, type ContractorStage } from "@/lib/incrementum/registry";
import SubmitButton from "@/components/ui/SubmitButton";
import { Badge, Priv, RowFold, Field, Avatar, BackTo, HiddenFields } from "./kit";
import { Dialog, OpenDialog, PaneTabs, PickSearch } from "./client";
import { n0, PASS_LINE } from "./helpers";
import { createNeedAction, addPackageLinesAction, updateNeedAction, setNeedWaivedAction, assignRoleAction, unassignRoleAction, deleteNeedAction } from "@/app/(incrementum)/incrementum/actions";

const PRICE_SOURCE: Record<string, string> = { override: "your price", cost_plus: "rate + markup", catalogue_floor: "raised to catalogue", service: "service price (no rate yet)", catalogue: "catalogue price", none: "no price yet" };

type Scope = { leadId?: string; engagementId?: string };

export default function ServicesTeam({ s, leadId, engagementId, back, readOnly = false }: { s: IncrementumSnapshot; back: string; readOnly?: boolean } & Scope) {
  const rows = s.state.needs.filter((n) => (engagementId ? n.engagementId === engagementId : n.leadId === leadId && !n.engagementId));
  const views = rows.map((n) => computeNeed(s.state, s.services, n));
  const t = quoteTotals(views);
  const groups = roleGroups(s.state, views);
  const freedom = n0(s.state.settings.freedomTarget);
  const size = (engagementId ? s.state.engagements.find((e) => e.id === engagementId)?.businessSize : s.state.leads.find((l) => l.id === leadId)?.businessSize) ?? null;
  const sizeLabel = size ? (BUSINESS_SIZE_LABELS[size as BusinessSize] ?? size) : null;
  const under = t.monthlyPrice > 0 && t.monthlyProfit < PASS_LINE;
  const scope = { leadId, engagementId };
  const addId = `add-lines-${leadId ?? engagementId}`;
  const proposal = engagementId ? `/print/incrementum/client/${engagementId}` : `/print/incrementum/lead/${leadId}`;

  return (
    <section className="panel st-panel" id="quote">
      <header className="phead">
        <span className="ptitle">Services &amp; team</span>
        <span className="r">
          <span className="eyebrow">{engagementId ? "Live client" : "Quote"}</span>
          {sizeLabel && <Badge>{sizeLabel}</Badge>}
          {t.unassigned > 0 && <Badge tone="warn">{t.unassigned} without a contractor</Badge>}
          {views.length > 0 && (
            <a className="btn btn-sm" href={proposal} target="_blank" rel="noreferrer">
              Apexus proposal ↗
            </a>
          )}
          {!readOnly && views.length > 0 && (
            <OpenDialog target={addId} className="btn btn-sm">
              <Plus size={12} /> Add package / service
            </OpenDialog>
          )}
        </span>
      </header>
      <div className="panel-pad">
        {views.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nothing on this profile yet</p>
            <p className="muted">Add a package, pick services one by one, or anything else from the GrayPortal catalogue.</p>
            {!readOnly && (
              <OpenDialog target={addId} className="btn btn-primary">
                <Plus size={13} /> Add package / service
              </OpenDialog>
            )}
          </div>
        ) : (
          <>
            <div className="st-totals">
              <div className="st-hero">
                <span className="hero-label">Monthly retainer</span>
                <span className="st-hero-value">
                  <Priv>{money(t.monthlyPrice)}</Priv>
                </span>
                <span className="muted small">
                  {t.monthlyDiscount ? (
                    <>
                      bundle −<Priv>{money(t.monthlyDiscount)}</Priv> off <Priv>{money(t.monthlySubtotal)}</Priv>
                    </>
                  ) : (
                    "no bundle discount"
                  )}
                </span>
              </div>
              <dl className="kv">
                <div data-tone={t.monthlyPrice ? (under ? "bad" : "good") : undefined}>
                  <dt>Profit / mo</dt>
                  <dd>
                    <Priv>{money(t.monthlyProfit)}</Priv> <small className="muted">{t.marginPct ?? "—"}% margin</small>
                  </dd>
                </div>
                <div>
                  <dt>Setup / one-off</dt>
                  <dd>
                    <Priv>{money(t.oneOffPrice)}</Priv>
                    {t.waivedValue ? (
                      <small className="muted">
                        {" "}
                        · <Priv>{money(t.waivedValue)}</Priv> waived
                      </small>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>
                    Clients like this for <Priv>{money(freedom)}</Priv>
                  </dt>
                  <dd>{clientsForTarget(freedom, t.monthlyProfit) ?? "—"}</dd>
                </div>
                <div data-tone="muted">
                  <dt>First year profit</dt>
                  <dd>
                    <Priv>{money(t.monthlyProfit * 12 + t.oneOffProfit)}</Priv>
                  </dd>
                </div>
              </dl>
            </div>
            {under && <p className="note note-bad">Under the {money(PASS_LINE)}/month pass line (plan §1.1).</p>}
            {t.unpriced > 0 && <p className="muted small">{t.unpriced} line(s) have no price yet.</p>}

            <div className="roles">
              {groups.map((g) => {
                const groupCost = g.lines.reduce((a, l) => a + (l.billing === "monthly" ? (l.cost ?? 0) : 0), 0);
                const assignId = `assign-${leadId ?? engagementId}-${g.roleId ?? "none"}`;
                return (
                  <div className="role" key={g.roleId ?? "none"}>
                    <div className="role-head">
                      <div>
                        <p className="role-name">{g.roleName}</p>
                        <span className="muted small">
                          {g.lines.length} line{g.lines.length === 1 ? "" : "s"}
                          {groupCost ? (
                            <>
                              {" "}
                              · <Priv>{money(groupCost)}</Priv>/mo contractor cost
                            </>
                          ) : (
                            ""
                          )}
                          {g.roleId === null ? " · work you do yourself" : ""}
                        </span>
                      </div>
                      <div className="row">
                        {g.contractorId ? (
                          <Link className="role-who" href={`/incrementum/contractors/${g.contractorId}`}>
                            <Avatar name={g.contractorName} size={28} active /> {g.contractorName}
                          </Link>
                        ) : g.assignedCount > 0 ? (
                          <Badge tone="warn">
                            {g.assignedCount}/{g.lines.length} assigned
                          </Badge>
                        ) : null}
                        {!readOnly && g.roleId && (
                          <OpenDialog target={assignId} className={g.contractorId ? "btn btn-sm" : "btn btn-sm btn-add"}>
                            {g.contractorId ? (
                              "Change"
                            ) : (
                              <>
                                <UserRound size={12} /> Add contractor
                              </>
                            )}
                          </OpenDialog>
                        )}
                        {!readOnly && g.assignedCount > 0 && (
                          <form action={unassignRoleAction} style={{ display: "contents" }}>
                            <BackTo path={back} />
                            <HiddenFields values={{ ...scope, roleId: g.roleId }} />
                            <button type="submit" className="linkbtn">
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    {g.lines.map((n) => (
                      <LineRow key={n.id} n={n} readOnly={readOnly} back={back} />
                    ))}
                    {!readOnly && g.roleId && <AssignDialog id={assignId} s={s} group={g} rows={rows} size={size} sizeLabel={sizeLabel} scope={scope} back={back} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {engagementId && (
          <p className="muted small" style={{ marginTop: 12 }}>
            On a live client, adding a contractor to a role also updates the engagement&apos;s team and monthly cost. The signed price only changes in Details.
          </p>
        )}
      </div>
      {!readOnly && <AddLinesDialog id={addId} s={s} rows={rows} scope={scope} back={back} />}
    </section>
  );
}

function LineRow({ n, readOnly, back }: { n: NeedView; readOnly: boolean; back: string }) {
  return (
    <RowFold
      className="line"
      summary={
        <>
          <span className="line-name">
            <b data-waived={n.waived || undefined}>
              {n.name}
              {n.title && n.title !== n.name ? <span className="muted"> · {n.title}</span> : null}
              {toNum(n.quantity) !== 1 ? <span className="muted"> × {n.quantity}</span> : null}
            </b>
            <small className="muted">
              {n.contractorName ? (
                <>
                  {n.contractorName} at <Priv>{money(n.rate)}</Priv>
                </>
              ) : n.rate !== null ? (
                <>
                  est. quote <Priv>{money(n.rate)}</Priv>
                </>
              ) : (
                "no contractor rate"
              )}{" "}
              · {n.markup}% markup · {PRICE_SOURCE[n.priceSource]}
            </small>
          </span>
          <span className="row line-chips">
            <Badge>{n.billing === "monthly" ? "monthly" : "one-off"}</Badge>
            {n.packageName && <Badge tone="accent">{n.packageName.split(" · ")[0]}</Badge>}
            {n.serviceItemId && <Badge>off-list</Badge>}
          </span>
          <span className="line-price">
            <b>{n.waived ? "Waived" : <Priv>{`${money(n.price)}${n.billing === "monthly" ? "/mo" : ""}`}</Priv>}</b>
            <small className="muted">
              profit <Priv>{money(n.profit)}</Priv>
            </small>
          </span>
          {!readOnly && n.billing !== "monthly" ? (
            <form action={setNeedWaivedAction} style={{ display: "contents" }}>
              <BackTo path={back} />
              <HiddenFields values={{ id: n.id, waived: n.waived ? "" : "on" }} />
              <button type="submit" className="linkbtn">
                {n.waived ? "Charge" : "Waive"}
              </button>
            </form>
          ) : (
            <span />
          )}
        </>
      }
    >
      {readOnly ? (
        <p className="muted small">Ended engagement: read-only.</p>
      ) : (
        <>
          <form className="form-grid g3" action={updateNeedAction}>
            <BackTo path={back} />
            <HiddenFields values={{ id: n.id }} />
            <Field label="Contractor rate ($)">
              <input className="input" name="contractorRate" defaultValue={n.contractorRate ?? ""} disabled={!n.contractorId} inputMode="decimal" />
            </Field>
            {!n.contractorId && <input type="hidden" name="contractorRate" value="" />}
            <Field label={`Markup % (blank = ${n.service?.effectiveMarkupPct ?? 33}%)`}>
              <input className="input" name="markupPct" defaultValue={n.markupPct ?? ""} inputMode="decimal" />
            </Field>
            <Field label="Your price ($, per unit)">
              <input className="input" name="sellPrice" defaultValue={n.sellPrice ?? ""} placeholder={n.unitPrice !== null ? String(n.unitPrice) : ""} inputMode="decimal" />
            </Field>
            <Field label="Quantity">
              <input className="input" name="quantity" defaultValue={n.quantity} inputMode="decimal" />
            </Field>
            <Field label="Detail">
              <input className="input" name="title" defaultValue={n.title ?? ""} placeholder="e.g. 2 locations" />
            </Field>
            <Field label="Tags">
              <input className="input" name="tags" defaultValue={(n.tags ?? []).join(", ")} />
            </Field>
            <Field label="Notes" wide>
              <input className="input" name="notes" defaultValue={n.notes ?? ""} />
            </Field>
            <div className="form-actions">
              <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                Save line
              </SubmitButton>
            </div>
          </form>
          <form action={deleteNeedAction} className="row">
            <BackTo path={back} />
            <HiddenFields values={{ id: n.id }} />
            <span className="spacer" />
            <button type="submit" className="linkbtn danger">
              Remove line
            </button>
          </form>
        </>
      )}
    </RowFold>
  );
}

function AddLinesDialog({ id, s, rows, scope, back }: { id: string; s: IncrementumSnapshot; rows: IncrementumSnapshot["state"]["needs"]; scope: Scope; back: string }) {
  const roles = s.state.roles.filter((r) => !r.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const roleName = (rid: string | null) => roles.find((r) => r.id === rid)?.name ?? null;
  const hasService = (sid: string) => rows.some((r) => r.serviceId === sid);
  const hasPackage = (pid: string) => rows.some((r) => r.packageId === pid);
  const hasItem = (cid: string) => rows.some((r) => r.serviceItemId === cid);
  const fields = (
    <>
      <BackTo path={back} />
      <HiddenFields values={{ ...scope }} />
    </>
  );
  const catalogue = [...s.state.catalogue].sort((a, b) => a.moduleCode.localeCompare(b.moduleCode) || a.deliverable.localeCompare(b.deliverable));
  return (
    <Dialog id={id} title="Add package / service" wide>
      <PaneTabs
        tabs={[
          {
            key: "package",
            label: "Package",
            pane: (
              <div className="pick-list">
                {s.packages.filter((p) => p.status !== "retired").length === 0 && <p className="muted small" style={{ padding: 14 }}>No packages yet. Build them in Services &amp; Pricing.</p>}
                {s.packages
                  .filter((p) => p.status !== "retired")
                  .map((p) => (
                    <form key={p.id} action={addPackageLinesAction} data-keep-open="" style={{ display: "contents" }}>
                      {fields}
                      <HiddenFields values={{ packageId: p.id }} />
                      <button type="submit" className="pick" disabled={hasPackage(p.id)}>
                        <span>
                          <b>
                            {p.name} {p.status !== "live" && <Badge>{p.status}</Badge>} {hasPackage(p.id) && <Badge tone="good">On profile</Badge>}
                          </b>
                          <small className="muted">{p.lines.map((l) => l.name).join(" · ")}</small>
                        </span>
                        <span className="pick-r">
                          <span>
                            <Priv>{money(p.totals.monthlyPrice)}</Priv>/mo
                          </span>
                          <small className={p.totals.monthlyProfit < PASS_LINE ? "tone-bad" : "tone-good"}>
                            profit <Priv>{money(p.totals.monthlyProfit)}</Priv>
                          </small>
                        </span>
                      </button>
                    </form>
                  ))}
              </div>
            ),
          },
          {
            key: "service",
            label: "Service",
            pane: (
              <div className="pick-list">
                {s.services
                  .filter((x) => x.status === "active")
                  .map((x) => (
                    <form key={x.id} action={createNeedAction} data-keep-open="" style={{ display: "contents" }}>
                      {fields}
                      <HiddenFields values={{ serviceId: x.id }} />
                      <button type="submit" className="pick" disabled={hasService(x.id)}>
                        <span>
                          <b>
                            {x.name} {hasService(x.id) && <Badge tone="good">On profile</Badge>}
                          </b>
                          <small className="muted">
                            {roleName(x.roleId) ?? "No contractor role"} · {x.billing === "monthly" ? "Monthly" : x.billing === "range" ? "By size" : "One-off"}
                          </small>
                        </span>
                        <span className="pick-r">{x.billing === "range" ? "By size" : <Priv>{money(x.price.sellPrice)}</Priv>}</span>
                      </button>
                    </form>
                  ))}
              </div>
            ),
          },
          {
            key: "catalogue",
            label: "Off-list (catalogue)",
            pane: (
              <div className="stack" style={{ gap: 10 }}>
                <p className="muted small">Anything from the GrayPortal catalogue, on this client only, at its catalogue price. It doesn&apos;t change the price book. Pick who delivers it so it lands under the right contractor.</p>
                <div className="pick-list">
                  <PickSearch placeholder="Search the catalogue…" />
                  {catalogue.map((c) => (
                    <form key={c.id} action={createNeedAction} data-keep-open="" className="pick" data-search={`${c.moduleCode} ${c.deliverable}`.toLowerCase()} style={{ gridTemplateColumns: "minmax(0, 1fr) auto 170px auto" }}>
                      {fields}
                      <HiddenFields values={{ serviceItemId: c.id }} />
                      <span>
                        <b>
                          <span className="mono">{c.moduleCode}</span> · {c.deliverable} {hasItem(c.id) && <Badge tone="good">On profile</Badge>}
                        </b>
                        <small className="muted">On this client only.</small>
                      </span>
                      <span className="pick-r">
                        <Priv>{c.isRecurring && c.currentMonthlyPrice ? `${money(toNum(c.currentMonthlyPrice))}/mo` : c.currentSetupPrice ? money(toNum(c.currentSetupPrice)) : (c.priceText ?? "No price")}</Priv>
                      </span>
                      <select className="select" name="roleId" defaultValue="" aria-label="Delivered by">
                        <option value="">No contractor</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="btn btn-sm btn-add" pendingLabel="…">
                        Add
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Dialog>
  );
}

// "Add contractor" for one role: name, price, jobs, green ADD (Max, 21 Oct).
function AssignDialog({
  id,
  s,
  group,
  rows,
  size,
  sizeLabel,
  scope,
  back,
}: {
  id: string;
  s: IncrementumSnapshot;
  group: RoleGroup;
  rows: IncrementumSnapshot["state"]["needs"];
  size: string | null;
  sizeLabel: string | null;
  scope: Scope;
  back: string;
}) {
  const all = roleCandidates(s.state, group, size);
  const candidates = all.filter((c) => c.sizeMatch);
  const hidden = all.length - candidates.length;
  const current = quoteTotals(rows.map((n) => computeNeed(s.state, s.services, n)));
  return (
    <Dialog id={id} title={`Add contractor · ${group.roleName}`} wide>
      <p className="muted small">
        Lines: {group.lines.map((l) => l.name).join(" · ")}. Today the quote makes <Priv>{money(current.monthlyProfit)}</Priv>/mo.
        {hidden > 0 && sizeLabel ? ` ${hidden} hidden: they don't take ${sizeLabel.toLowerCase()} jobs.` : ""}
      </p>
      {candidates.length === 0 ? (
        <p className="empty-title">Nobody fills this role yet. Tick the role on a contractor&apos;s profile.</p>
      ) : (
        <div className="cand-list">
          {candidates.map((c) => {
            const preview = previewRole(s.state, s.services, rows, group, c.contractorId).totals;
            const pass = preview.monthlyProfit >= PASS_LINE;
            const assigned = group.contractorId === c.contractorId;
            return (
              <form key={c.contractorId} action={assignRoleAction} className="cand" data-current={assigned || undefined}>
                <BackTo path={back} />
                <HiddenFields values={{ ...scope, roleId: group.roleId, contractorId: c.contractorId }} />
                <Avatar name={c.name} size={38} active={c.onBench} />
                <span className="cand-who">
                  <b>{c.name}</b>
                  <small className="muted">
                    {CONTRACTOR_STAGE_LABELS[c.stage as ContractorStage] ?? c.stage} · {c.jobs} job{c.jobs === 1 ? "" : "s"} · quoted {c.lines.length - c.missingQuotes}/{group.lines.length}
                    {!c.roleMatch ? " · role not ticked" : ""}
                  </small>
                </span>
                <span className="cand-num">
                  <small className="muted">Rates</small>
                  <Priv>{c.lines.map((l) => (l.rate === null ? "est." : money(l.rate))).join(" + ")}</Priv>
                </span>
                <span className="cand-num">
                  <small className="muted">Profit then</small>
                  <b className={pass ? "tone-good" : "tone-bad"}>
                    <Priv>{money(preview.monthlyProfit)}</Priv>
                  </b>
                </span>
                {assigned ? (
                  <button type="button" className="btn btn-add" disabled>
                    Assigned
                  </button>
                ) : (
                  <SubmitButton className="btn btn-add" pendingLabel="…">
                    Add
                  </SubmitButton>
                )}
              </form>
            );
          })}
        </div>
      )}
      <p className="muted small">Pass line {money(PASS_LINE)}/month profit. Not on the bench yet = not Confirmed or Onboarded.</p>
    </Dialog>
  );
}

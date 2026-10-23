import Link from "next/link";
import { Plus, Lock, Star } from "lucide-react";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listClientsForEngagements } from "@/lib/dal/incrementum/engagements";
import { BUSINESS_SIZES, BUSINESS_SIZE_LABELS, ENGAGEMENT_HEALTH_LABELS } from "@/lib/incrementum/registry";
import { money, formatMetric } from "@/lib/incrementum/format";
import { monthsBetween } from "@/lib/incrementum/evaluate";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Priv, Field, MiniBar, Monogram, GrayPortalChecklist, Console, Csec, TermStatus, TotalSplit, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog, PaneTabs } from "@/components/incrementum/terminal/client";
import { WORK_STEPS } from "@/components/incrementum/terminal/cycle-row";
import { monthName, daysBetween, tintFor, n0, PASS_LINE, healthTone, engagementCost, reviewOpen } from "@/components/incrementum/terminal/helpers";
import { addClientAction } from "../actions";

const BASE = "/incrementum/clients";
type S = IncrementumSnapshot;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const sp = await searchParams;
  const [s, gpClients] = await Promise.all([getIncrementumSnapshot(), listClientsForEngagements()]);
  const st = s.state;
  const m = s.metrics;
  const live = st.engagements.filter((e) => e.status !== "ended");
  const ended = st.engagements.filter((e) => e.status === "ended");
  const mrr = m.mrr ?? 0;
  const profit = mrr - (m.monthly_contractor_cost ?? 0);
  const target = s.phases.current?.clientMax ?? 3;
  const openSlots = Math.max(0, Math.min(3, target - live.length));
  const watch = live.filter((e) => e.health !== "good").length;
  const reviews = live.filter((e) => reviewOpen(e, st.today) && !e.reviewRequestedAt).length;

  return (
    <div className="screen">
      <PageHead title="Clients" sub="Incrementum clients: run by contractors month by month, and full GrayPortal clients too. Prices are the signed prices.">
        <OpenDialog target="client-add" className="btn btn-primary">
          <Plus size={14} /> Add client
        </OpenDialog>
      </PageHead>
      <Console>
        <Csec>
          <TermStatus label="Clients" value={`${m.active_clients ?? 0} active`} tone={m.active_clients ? undefined : "warn"}>
            {watch ? `${watch} on watch · ` : ""}
            {reviews ? `${reviews} ready for a review request · ` : ""}
            {ended.length} ended
          </TermStatus>
        </Csec>
        <TotalSplit
          items={[
            { label: "Monthly revenue (MRR)", value: money(mrr), priv: true, sub: "signed monthly price of every active client" },
            { label: "Profit / mo", value: money(profit), priv: true, sub: `after contractors · ${formatMetric(m.avg_margin_pct, "percent")} margin` },
            {
              label: "Profit / client",
              value: formatMetric(m.avg_profit_per_client, "currency"),
              priv: true,
              tone: m.avg_profit_per_client !== null && m.avg_profit_per_client < PASS_LINE ? "bad" : undefined,
              sub: `pass line ${money(PASS_LINE)}`,
            },
          ]}
        />
        <Csec>
          <div className="mct">
            {live.map((e) => {
              const price = n0(e.monthlyPrice);
              const cost = engagementCost(s, e.id);
              const margin = price ? (price - cost) / price : 0;
              const start = e.startDate ?? st.today;
              const termEnd = e.minTermEnd ?? start;
              const term = termEnd <= start ? 1 : Math.min(1, daysBetween(start, st.today) / Math.max(1, daysBetween(start, termEnd)));
              const latest = st.cycles.filter((c) => c.engagementId === e.id).sort((a, b) => b.month.localeCompare(a.month))[0];
              const steps = latest ? WORK_STEPS.filter(([k]) => latest[k]).length : 0;
              const name = e.clientName ?? e.name;
              return (
                <Link key={e.id} className="mct-tile" href={`${BASE}/${e.id}`}>
                  <span className="mct-name">
                    {name}
                    <Badge tone={e.status === "paused" ? "warn" : healthTone(e.health)}>{e.status === "paused" ? "Paused" : (ENGAGEMENT_HEALTH_LABELS[e.health as keyof typeof ENGAGEMENT_HEALTH_LABELS] ?? e.health)}</Badge>
                  </span>
                  <span className="mct-art brand-banner" style={{ "--tint": tintFor(e.id) } as React.CSSProperties}>
                    <Monogram text={name.trim()[0]?.toUpperCase() ?? "?"} />
                  </span>
                  <span className="mct-foot">
                    <span className="mct-bar">
                      <span>Margin</span>
                      <MiniBar value={margin} tone={price - cost < PASS_LINE ? "warn" : "good"} />
                      <b>{Math.round(margin * 100)}%</b>
                    </span>
                    <span className="mct-bar" title={latest ? `${monthName(latest.month, true)}: delivered, approved, report, invoiced` : ""}>
                      <span>{latest ? `${monthName(latest.month)} work` : "This month"}</span>
                      <MiniBar value={steps / 4} />
                      <b>{steps}/4</b>
                    </span>
                    <span className="mct-bar">
                      <span>Min term</span>
                      <MiniBar value={term} tone="neutral" />
                      <b>{term >= 1 ? "done" : `${Math.round(term * 100)}%`}</b>
                    </span>
                    <span className="row" style={{ justifyContent: "space-between" }}>
                      <span className="muted small">
                        {reviewOpen(e, st.today) && !e.reviewRequestedAt ? (
                          <span className="tone-good">
                            <Star size={11} /> Ask for a review
                          </span>
                        ) : (
                          <>
                            <Priv>{money(price)}</Priv>/mo · {monthsBetween(start, st.today).toFixed(1)} mo
                          </>
                        )}
                      </span>
                      <span className="mct-manage">Manage ›</span>
                    </span>
                  </span>
                </Link>
              );
            })}
            {Array.from({ length: openSlots }, (_, i) => (
              <div key={i} className="mct-tile" data-locked>
                <span className="mct-name">
                  Open seat <Lock size={13} />
                </span>
                <span className="mct-art brand-banner" style={{ "--tint": "var(--t-faint)" } as React.CSSProperties}>
                  <Lock size={26} style={{ position: "relative", color: "var(--t-faint)" }} />
                </span>
                <span className="mct-foot">
                  <span className="muted small">Phase target: {target} clients</span>
                </span>
              </div>
            ))}
            <OpenDialog target="client-add" className="mct-tile" data-add="">
              <Plus size={22} /> Add client
            </OpenDialog>
          </div>
        </Csec>
        {ended.length > 0 && (
          <Csec>
            <Ledger rows={[["Past clients", `${ended.length} · in the archive`, "muted", "/incrementum/archive"]]} />
          </Csec>
        )}
      </Console>
      <AddClientDialog s={s} gpClients={gpClients} openOnLoad={sp.add === "1"} />
      <IncrementumReadySignal />
    </div>
  );
}

function AddClientDialog({ s, gpClients, openOnLoad }: { s: S; gpClients: { id: string; name: string }[]; openOnLoad?: boolean }) {
  const already = new Set(s.state.engagements.filter((e) => e.status !== "ended").map((e) => e.clientId));
  const common = (
    <>
      <Field label="Package">
        <select className="select" name="packageId" defaultValue="">
          <option value="">None (build it in Services &amp; team)</option>
          {s.packages
            .filter((p) => p.status !== "retired")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money(p.totals.monthlyPrice)}/mo
              </option>
            ))}
        </select>
      </Field>
      <Field label="Signed monthly price">
        <input className="input" name="monthlyPrice" required inputMode="decimal" />
      </Field>
      <Field label="Setup fee">
        <input className="input" name="setupPrice" inputMode="decimal" />
      </Field>
      <Field label="Start">
        <input className="input" type="date" name="startDate" defaultValue={s.state.today} required />
      </Field>
      <Field label="Minimum term">
        <select className="select" name="minTermMonths" defaultValue="3">
          <option value="0">None (month to month)</option>
          {[1, 3, 6, 12].map((m) => (
            <option key={m} value={m}>
              {m} month{m === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
  return (
    <Dialog id="client-add" title="Add a client" wide openOnLoad={openOnLoad}>
      <p className="muted small">Signed someone outside the lead desk? Add them here, for any term. They land in GrayPortal as a normal client, and in Incrementum as an Incrementum client.</p>
      <PaneTabs
        hangar
        tabs={[
          {
            key: "existing",
            label: "Existing GrayPortal client",
            pane: (
              <form className="form-grid g3" action={addClientAction}>
                <BackTo path={BASE} />
                <HiddenFields values={{ mode: "existing" }} />
                <Field label="GrayPortal client">
                  <select className="select" name="clientId" required defaultValue="">
                    <option value="" disabled>
                      Pick a client
                    </option>
                    {gpClients.map((c) => (
                      <option key={c.id} value={c.id} disabled={already.has(c.id)}>
                        {c.name}
                        {already.has(c.id) ? " (already in Incrementum)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Name in Incrementum">
                  <input className="input" name="name" placeholder="e.g. Apex · Google Ads" required />
                </Field>
                {common}
                <div style={{ gridColumn: "1 / -1" }}>
                  <GrayPortalChecklist existing />
                </div>
                <div className="form-actions">
                  <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                    Link and start
                  </SubmitButton>
                </div>
              </form>
            ),
          },
          {
            key: "new",
            label: "New client",
            pane: (
              <form className="form-grid g3" action={addClientAction}>
                <BackTo path={BASE} />
                <HiddenFields values={{ mode: "new" }} />
                <Field label="Business">
                  <input className="input" name="businessName" required />
                </Field>
                <Field label="Contact name">
                  <input className="input" name="contactName" />
                </Field>
                <Field label="Contact email (portal login)">
                  <input className="input" type="email" name="email" required />
                </Field>
                <Field label="Phone">
                  <input className="input" name="phone" />
                </Field>
                <Field label="Website">
                  <input className="input" name="website" />
                </Field>
                <Field label="Business size">
                  <select className="select" name="businessSize" defaultValue="">
                    <option value="">Not set</option>
                    {BUSINESS_SIZES.map((z) => (
                      <option key={z} value={z}>
                        {BUSINESS_SIZE_LABELS[z]}
                      </option>
                    ))}
                  </select>
                </Field>
                {common}
                <div style={{ gridColumn: "1 / -1" }}>
                  <GrayPortalChecklist />
                </div>
                <div className="form-actions">
                  <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                    Add client to GrayPortal + Incrementum
                  </SubmitButton>
                </div>
              </form>
            ),
          },
        ]}
      />
    </Dialog>
  );
}

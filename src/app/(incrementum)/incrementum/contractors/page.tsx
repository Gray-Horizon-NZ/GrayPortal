import Link from "next/link";
import { Users, UserPlus, ShieldCheck, Workflow, Download, X, Lock, UserRound } from "lucide-react";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { listContractorsWithoutProfile, listContractorLogins } from "@/lib/dal/incrementum/contractors";
import { matchContractors, type BenchMatch } from "@/lib/incrementum/compute";
import { CONTRACTOR_STAGES, CONTRACTOR_STAGE_LABELS, BENCH_STAGES, BUSINESS_SIZES, BUSINESS_SIZE_LABELS, type ContractorStage } from "@/lib/incrementum/registry";
import { money } from "@/lib/incrementum/format";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Priv, Field, Avatar, StageTiles, Console, Csec, IdCard, Blocks, TermStatus, ServiceSlots, Bracket, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { Dialog, FilterForm, RangeField } from "@/components/incrementum/terminal/client";
import { fmtDate, daysBetween, isoOf, n0, engagementCost } from "@/components/incrementum/terminal/helpers";
import { createContractorAction, addExistingContractorAction } from "../actions";

const BASE = "/incrementum/contractors";
const SIZE_SHORT: Record<string, string> = { small: "S", medium: "M", large: "L" };
const MAX_RATE = 1500;
type S = IncrementumSnapshot;
type Profile = S["state"]["profiles"][number];
type SP = { view?: string; service?: string; role?: string; sizes?: string | string[]; max?: string; bench?: string; off?: string; sel?: string; stage?: string; add?: string };

const label = (stage: string) => CONTRACTOR_STAGE_LABELS[stage as ContractorStage] ?? stage;
const rateLabel = (rate: string | number | null, type: string) => `${money(rate)}/${type === "monthly" ? "mo" : type}`;

export default async function ContractorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [s, unprofiled, logins] = await Promise.all([getIncrementumSnapshot(), listContractorsWithoutProfile(), listContractorLogins()]);
  const st = s.state;
  const view = sp.view === "pipeline" || sp.view === "access" ? sp.view : "bench";
  // sizes arrive as repeated params from the filter form and comma-joined from links.
  const sizes = (Array.isArray(sp.sizes) ? sp.sizes : sp.sizes ? [sp.sizes] : []).flatMap((z) => z.split(",")).filter((z) => (BUSINESS_SIZES as readonly string[]).includes(z));
  const maxRate = sp.max && Number(sp.max) < MAX_RATE ? Number(sp.max) : null;
  const f = { serviceId: sp.service || null, roleId: sp.role || null, sizes, maxRate, benchOnly: sp.bench === "1", offRamp: sp.off === "1" };
  const filtering = !!(f.serviceId || f.roleId || sizes.length || maxRate !== null || f.benchOnly || f.offRamp);
  const filterParams = { service: f.serviceId, role: f.roleId, sizes: sizes.join(",") || null, max: maxRate, bench: f.benchOnly ? "1" : null, off: f.offRamp ? "1" : null };
  const here = (extra: Record<string, string | number | null> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filterParams, ...extra })) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
    const str = q.toString();
    return str ? `${BASE}?${str}` : BASE;
  };
  const rows = matchContractors(st, f);
  const profileOf = new Map(st.profiles.map((p) => [p.contractorId, p]));
  const bench = st.profiles.filter((p) => BENCH_STAGES.includes(p.stage as ContractorStage));
  const pipeline = st.profiles.filter((p) => (CONTRACTOR_STAGES.slice(0, 4) as readonly string[]).includes(p.stage));
  const svc = (id: string | null) => s.services.find((x) => x.id === id);
  const selRow = rows.find((r) => r.contractorId === sp.sel) ?? null;
  const quotesOf = (cid: string) => st.contractorServices.filter((cs) => cs.contractorId === cid);

  // Service lines: every active monthly service in a live package, plus any quoted by the bench.
  const live = new Set(s.packages.filter((p) => p.status === "live").flatMap((p) => p.lines.filter((l) => l.kind === "recurring").map((l) => l.serviceId)));
  const benchIds = new Set(bench.map((p) => p.contractorId));
  const lineServices = s.services.filter((x) => x.status === "active" && x.billing === "monthly" && (live.has(x.id) || st.contractorServices.some((cs) => cs.serviceId === x.id && benchIds.has(cs.contractorId))));
  const engById = new Map(st.engagements.map((e) => [e.id, e]));
  const leadById = new Map(st.leads.map((l) => [l.id, l]));
  const needsWork = (n: S["state"]["needs"][number]) => (n.engagementId ? engById.get(n.engagementId)?.status === "active" : !!n.leadId && leadById.get(n.leadId)?.stage !== "lost" && !leadById.get(n.leadId)?.convertedClientId);
  const slots = lineServices.map((x) => {
    const covered = new Set(st.contractorServices.filter((cs) => cs.serviceId === x.id && benchIds.has(cs.contractorId)).map((cs) => cs.contractorId)).size;
    const needs = st.needs.filter((n) => n.serviceId === x.id && !n.contractorId && needsWork(n)).length;
    return {
      key: x.id,
      label: x.name,
      state: (covered ? "assigned" : needs ? "open" : "locked") as "assigned" | "open" | "locked",
      sub: covered ? `${covered} on the bench${needs ? ` · ${needs} line(s) unassigned` : ""}` : needs ? `${needs} line(s) need someone` : "No client needs it yet",
      active: f.serviceId === x.id,
      href: here({ service: f.serviceId === x.id ? null : x.id }),
      title: "Filter the bench by this service",
    };
  });
  const margin = st.engagements.filter((e) => e.status === "active").reduce((a, e) => a + n0(e.monthlyPrice) - engagementCost(s, e.id), 0);
  const rolesOpen = st.roles.filter((r) => !bench.some((c) => (c.roleIds ?? []).includes(r.id)));
  const lockdown = Boolean(st.contractorLockdownApplied);
  const waitingLines = st.needs.filter((n) => !n.contractorId && (s.services.find((x) => x.id === n.serviceId)?.roleId ?? n.roleId) && needsWork(n)).length;

  return (
    <div className="screen">
      <PageHead title="Contractor bench" sub="Recruit the bench: source → contact → meet → vet → confirm → onboard. Every stage change is timed; Capacity uses it to set recruit-by dates.">
        <Link className="btn btn-primary" href={`${BASE}?add=1`} scroll={false}>
          <UserPlus size={14} /> Add contractor
        </Link>
      </PageHead>
      <Console
        side={
          <>
            <IdCard
              strip="Gray Horizon Team"
              rows={[
                ["On the bench", `${bench.length} ready for work`],
                ["Recruiting", `${pipeline.length} in the pipeline`],
              ]}
            />
            <p className="muted small">On the bench = Confirmed or Onboarded: vetted, agreements in hand, ready to be given client work.</p>
            <Blocks
              value={view}
              items={[
                { key: "bench", label: "Bench & hiring", icon: Users, count: rows.length, href: here() },
                { key: "pipeline", label: "Recruiting pipeline", icon: Workflow, count: pipeline.length, href: `${BASE}?view=pipeline` },
                { key: "access", label: "Contractor access", icon: ShieldCheck, href: `${BASE}?view=access` },
                { label: "Add contractor", icon: UserPlus, dialog: "contractor-add" },
                { label: "Bring in from GrayPortal", icon: Download, dialog: "contractor-bring", count: unprofiled.length || undefined },
              ]}
            />
          </>
        }
      >
        {view === "bench" && (
          <>
            <Csec className="tight">
              <FilterForm action={BASE} className="filters">
                <label className="filter">
                  <span>Service</span>
                  <select className="select" name="service" defaultValue={f.serviceId ?? ""} style={{ width: 200, height: 30 }}>
                    <option value="">All services</option>
                    {s.services
                      .filter((x) => x.status === "active")
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="filter">
                  <span>Role</span>
                  <select className="select" name="role" defaultValue={f.roleId ?? ""} style={{ width: 170, height: 30 }}>
                    <option value="">Any role</option>
                    {st.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="filter">
                  <span>Works with</span>
                  {BUSINESS_SIZES.map((z) => (
                    <label key={z} className="chipbtn" title={BUSINESS_SIZE_LABELS[z]} data-active={sizes.includes(z) || undefined}>
                      <input type="checkbox" name="sizes" value={z} defaultChecked={sizes.includes(z)} hidden />
                      {SIZE_SHORT[z]}
                    </label>
                  ))}
                </span>
                <span className="filter">
                  <span>Max rate</span>
                  <RangeField name="max" min={50} max={MAX_RATE} step={25} defaultValue={maxRate ?? MAX_RATE} format="money" />
                </span>
                <label className="chipbtn" data-active={f.benchOnly || undefined}>
                  <input type="checkbox" name="bench" value="1" defaultChecked={f.benchOnly} hidden />
                  Bench only
                </label>
                <label className="chipbtn" data-active={f.offRamp || undefined}>
                  <input type="checkbox" name="off" value="1" defaultChecked={f.offRamp} hidden />
                  Paused / not a fit
                </label>
                {filtering && (
                  <Link className="linkbtn" href={BASE} scroll={false}>
                    Clear
                  </Link>
                )}
              </FilterForm>
            </Csec>
            <Csec>
              <div className="csec-head">
                <span className="csec-title">{f.serviceId ? `${svc(f.serviceId)?.name ?? "Service"} contractors` : "All contractors"}</span>
                <span className="csec-right">{rows.length} shown · bench first, then role match, then cheapest</span>
              </div>
              <div className="staff">
                {rows.map((r) => (
                  <Link
                    key={r.contractorId}
                    className="staff-tile"
                    data-state={r.onBench ? (r.stage === "onboarded" ? "team" : "bench") : ["paused", "not_a_fit"].includes(r.stage) ? "off" : "pipe"}
                    data-active={sp.sel === r.contractorId || undefined}
                    href={here({ sel: sp.sel === r.contractorId ? null : r.contractorId })}
                    scroll={false}
                  >
                    <span className="staff-tag">{label(r.stage)}</span>
                    <span className="staff-face">
                      {r.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    {r.onBench && <UserRound size={18} className="staff-mark" aria-hidden />}
                    <span className="staff-who">
                      {r.name}
                      <small>{r.rate !== null ? <Priv>{`${f.serviceId ? "" : "from "}${rateLabel(r.rate, r.rateType ?? "monthly")}`}</Priv> : f.serviceId ? "No quote yet" : r.specialty}</small>
                    </span>
                  </Link>
                ))}
                <Link className="staff-tile" data-state="hire" href={`${BASE}?add=1`} scroll={false}>
                  <span className="staff-hire">Hire</span>
                  <span className="staff-who">
                    <small>{f.serviceId ? `Recruit for ${svc(f.serviceId)?.name ?? "this service"}` : "Add a contractor"}</small>
                  </span>
                </Link>
                {!filtering &&
                  rolesOpen.map((r) => (
                    <div key={r.id} className="staff-tile" data-state="locked">
                      <Lock size={18} className="staff-lock" aria-hidden />
                      <span className="staff-who">
                        {r.name}
                        <small>No one in this role yet</small>
                      </span>
                    </div>
                  ))}
              </div>
              {rows.length === 0 && (
                <p className="muted small" style={{ marginTop: 12 }}>
                  No one matches. Loosen a filter, or hire for it.
                </p>
              )}
            </Csec>
            {selRow && profileOf.get(selRow.contractorId) && <SelectedContractor s={s} row={selRow} p={profileOf.get(selRow.contractorId)!} serviceId={f.serviceId} quotes={quotesOf(selRow.contractorId)} closeHref={here()} />}
            {slots.length > 0 && (
              <Csec>
                <p className="csec-desc" style={{ marginBottom: 16 }}>
                  Select a contractor and assign them to a service line. A line opens once a paying client or an open quote needs it. Assigned contractors deliver the work; you bill the client at their rate plus your markup.
                </p>
                <ServiceSlots slots={slots} />
              </Csec>
            )}
            <Csec>
              <Ledger
                rows={[
                  ["Contractors on the bench", `${bench.length}/${bench.length + pipeline.length}`],
                  ["Service lines covered", `${slots.filter((x) => x.state === "assigned").length}/${slots.length}`, slots.some((x) => x.state === "open") ? "warn" : undefined],
                  ["Lines waiting for a contractor", waitingLines],
                  ["Margin accrued (this month)", <Priv key="m">{money(margin)}</Priv>],
                  ["Contractor payouts / month", <Priv key="p">{money(s.metrics.monthly_contractor_cost)}</Priv>, undefined, "/incrementum/payouts"],
                ]}
              />
            </Csec>
          </>
        )}
        {view === "pipeline" && <PipelineView s={s} stage={sp.stage ?? null} />}
        {view === "access" && (
          <Csec>
            <TermStatus label="Contractor access" value={lockdown ? "Locked down" : "Open"} tone={lockdown ? undefined : "bad"}>
              {lockdown ? "Onboarding unlocked" : "Onboarding locked"}
            </TermStatus>
            <p className="csec-desc" style={{ marginTop: 14 }}>
              {lockdown
                ? "Contractor logins only reach their own workspace (/work): their clients, months, tasks, payouts, playbooks and the team, through views that never show what a client pays. No CRM, no client list, no prices, no emails."
                : "Today a contractor login can read and write every company, contact, client, task, client price, the pricing catalogue and every email. Apply db/sql/031_contractor_scoping.sql; onboarding unlocks automatically once it's in."}
            </p>
            <Ledger
              rows={logins
                .filter((u) => u.contractorId && profileOf.has(u.contractorId))
                .map((u) => [profileOf.get(u.contractorId!)!.name, `${u.email} · ${u.active ? "active" : "invited"}`, undefined, `${BASE}/${u.contractorId}`])}
            />
            {logins.length === 0 && <p className="muted small">No contractor logins yet.</p>}
          </Csec>
        )}
      </Console>

      <Dialog id="contractor-add" title="Add a contractor" wide openOnLoad={sp.add === "1"}>
        <form className="form-grid g3" action={createContractorAction}>
          <BackTo path={BASE} />
          <Field label="Name">
            <input className="input" name="name" required />
          </Field>
          <Field label="Specialty">
            <input className="input" name="specialty" placeholder="Google + Meta ads" />
          </Field>
          <Field label="Stage">
            <select className="select" name="stage" defaultValue="sourced">
              {CONTRACTOR_STAGES.filter((x) => x !== "onboarded").map((x) => (
                <option key={x} value={x}>
                  {CONTRACTOR_STAGE_LABELS[x]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <input className="input" type="email" name="email" />
          </Field>
          <Field label="Phone">
            <input className="input" name="phone" />
          </Field>
          <Field label="Found via">
            <input className="input" name="source" placeholder="Cold call, referral, LinkedIn…" />
          </Field>
          <Field label="Portfolio" wide>
            <input className="input" name="portfolioUrl" placeholder="https://…" />
          </Field>
          <div className="form-actions">
            <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
              Add contractor
            </SubmitButton>
            <span className="muted small">Roles, sizes and quotes go on their profile next.</span>
          </div>
        </form>
      </Dialog>
      <Dialog id="contractor-bring" title="Already in GrayPortal">
        {unprofiled.length === 0 ? (
          <p className="muted small">Every GrayPortal contractor is in Incrementum.</p>
        ) : (
          <dl className="ledger">
            {unprofiled.map((c) => (
              <div key={c.id}>
                <dt>
                  {c.name} <small className="muted">{c.specialty}</small>
                </dt>
                <dd>
                  <form action={addExistingContractorAction}>
                    <BackTo path={BASE} />
                    <HiddenFields values={{ contractorId: c.id }} />
                    <SubmitButton className="btn btn-sm" pendingLabel="…">
                      Bring in
                    </SubmitButton>
                  </form>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Dialog>
      <IncrementumReadySignal />
    </div>
  );
}

function SelectedContractor({ s, row, p, serviceId, quotes, closeHref }: { s: S; row: BenchMatch; p: Profile; serviceId: string | null; quotes: S["state"]["contractorServices"]; closeHref: string }) {
  const svcName = (sid: string) => s.services.find((x) => x.id === sid)?.name ?? "Service";
  const signed = p.payWhenPaidAcceptedAt && p.nonSolicitSignedAt;
  const sizes = p.worksWithSizes ?? [];
  return (
    <Csec className="selected-strip">
      <div className="selected-grid">
        <div>
          <p className="csec-title">{p.name}</p>
          <p className="muted small">
            {p.specialty ?? "—"} · {label(p.stage)} since {fmtDate(p.stageChangedAt)}
          </p>
          <div className="chiprow" style={{ marginTop: 10 }}>
            {s.state.roles
              .filter((r) => (p.roleIds ?? []).includes(r.id))
              .map((r) => (
                <Badge key={r.id}>{r.name}</Badge>
              ))}
            <Badge>{sizes.length ? `Works with ${sizes.map((z) => SIZE_SHORT[z] ?? z).join(" · ")}` : "Any size"}</Badge>
            {serviceId && row.missingQuote && <Badge tone="warn">Role match, no quote</Badge>}
          </div>
        </div>
        <Ledger
          rows={[
            ...quotes.map((x) => [svcName(x.serviceId), <Priv key={x.id}>{`${rateLabel(x.rate, x.rateType)} · ${x.capacitySlots ?? "?"} slots`}</Priv>, x.serviceId === serviceId ? "good" : undefined] as [string, React.ReactNode, string?]),
            quotes.length === 0 && ["Quotes", "None yet", "muted"],
            ["Jobs (clients + open quotes)", row.jobs],
            ["Agreements", signed ? "Signed" : "Missing", signed ? "good" : "warn"],
          ]}
        />
        <div className="stack" style={{ gap: 8 }}>
          <Bracket wide href={`${BASE}/${p.contractorId}`}>
            Open profile
          </Bracket>
          <Link className="linkbtn muted" href={closeHref} scroll={false}>
            <X size={12} /> Close
          </Link>
        </div>
      </div>
    </Csec>
  );
}

function PipelineView({ s, stage }: { s: S; stage: string | null }) {
  const st = s.state;
  const valid = stage && (CONTRACTOR_STAGES as readonly string[]).includes(stage) ? stage : null;
  const rows = st.profiles.filter((c) => (valid ? c.stage === valid : (CONTRACTOR_STAGES as readonly string[]).includes(c.stage)));
  const svcName = (sid: string) => s.services.find((x) => x.id === sid)?.name ?? "Service";
  return (
    <>
      <Csec>
        <StageTiles
          cols={6}
          value={valid}
          tiles={CONTRACTOR_STAGES.map((x) => ({
            key: x,
            name: CONTRACTOR_STAGE_LABELS[x],
            n: st.profiles.filter((c) => c.stage === x).length,
            done: BENCH_STAGES.includes(x) && st.profiles.some((c) => c.stage === x),
            href: valid === x ? `${BASE}?view=pipeline` : `${BASE}?view=pipeline&stage=${x}`,
          }))}
        />
      </Csec>
      <Csec className="flush">
        <div className="agency-list-head">
          {valid ? CONTRACTOR_STAGE_LABELS[valid as ContractorStage] : "Everyone in the pipeline"}
          <span className="r">{rows.length}</span>
        </div>
        {rows.map((c) => {
          const days = daysBetween(isoOf(c.stageChangedAt), st.today);
          const stale = ["contacted", "meeting_booked", "vetting"].includes(c.stage) && days > 7;
          const quotes = st.contractorServices.filter((cs) => cs.contractorId === c.contractorId);
          return (
            <Link key={c.contractorId} className="agency-row" href={`${BASE}/${c.contractorId}`}>
              <span className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                <Avatar name={c.name} size={30} active={c.stage === "onboarded"} />
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.specialty ?? "—"} ·{" "}
                    <Priv>
                      {quotes
                        .slice(0, 2)
                        .map((x) => `${svcName(x.serviceId)} ${rateLabel(x.rate, x.rateType)}`)
                        .join(" · ") || "no quotes yet"}
                    </Priv>
                  </small>
                </span>
              </span>
              <span className="r">
                <Badge tone={c.stage === "onboarded" ? "accent" : c.stage === "confirmed" ? "good" : undefined}>{label(c.stage)}</Badge>
                <small>{stale ? <span className="tone-warn">Follow up · {days}d</span> : `since ${fmtDate(c.stageChangedAt)}`}</small>
              </span>
            </Link>
          );
        })}
      </Csec>
    </>
  );
}

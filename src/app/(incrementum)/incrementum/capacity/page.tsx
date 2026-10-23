import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { capacityRules } from "@/lib/incrementum/compute";
import { contractorsNeeded } from "@/lib/incrementum/evaluate";
import { BENCH_STAGES, BUSINESS_SIZE_LABELS, type BusinessSize, type ContractorStage } from "@/lib/incrementum/registry";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHead, Badge, Field, Avatar, Console, Csec, TermStatus, StockColumns, Ledger, BackTo, HiddenFields } from "@/components/incrementum/terminal/kit";
import { AutoSubmitForm } from "@/components/incrementum/terminal/client";
import { longDate, addDays, daysBetween, isoOf, n0 } from "@/components/incrementum/terminal/helpers";
import { saveCapacityThresholdsAction, setContractorSlotsAction, setSlotWeightAction } from "../actions";

const BASE = "/incrementum/capacity";

// ─── Capacity (nightclub stock + editable limits) ───────────────────────
export default async function CapacityPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const sp = await searchParams;
  const s = await getIncrementumSnapshot();
  const st = s.state;
  const m = s.metrics;
  const rules = capacityRules(st);
  const caps = s.capacity;
  const c = caps.find((x) => x.serviceId === sp.service) ?? caps.find((x) => !x.benchOk) ?? caps[0];
  const back = c ? `${BASE}?service=${c.serviceId}` : BASE;
  const next = s.phases.next;
  const confirmedDays = st.profiles
    .filter((x) => BENCH_STAGES.includes(x.stage as ContractorStage))
    .map((x) => daysBetween(isoOf(x.createdAt), isoOf(x.stageChangedAt)))
    .filter((d) => d > 0);
  const measured = confirmedDays.length ? Math.round(confirmedDays.reduce((a, b) => a + b, 0) / confirmedDays.length) : null;
  const daysToRecruit = measured ?? rules.recruitDays;
  const total = caps.reduce((a, x) => [a[0] + x.slotsUsed, a[1] + x.slotsTotal], [0, 0]);
  const noBackup = caps.filter((x) => !x.benchOk);
  const clientGoals = s.goals.filter((g) => g.metricKey === "active_clients" && g.periodEnd && g.status !== "hit");

  return (
    <div className="screen">
      <PageHead title="Capacity" sub="Client slots per service. Each bench contractor brings the slots they declare on their quote; each active client takes its slot weight." />
      <Console>
        <Csec>
          <TermStatus label="Bench status" value={noBackup.length ? `${noBackup.length} service${noBackup.length === 1 ? "" : "s"} without a backup` : "Covered"} tone={noBackup.length ? "warn" : undefined}>
            {next ? `Next: Phase ${next.number} · ${next.clientMax ?? next.clientMin ?? "?"} clients${next.targetDate ? ` by ${longDate(next.targetDate)}` : ""}` : ""}
          </TermStatus>
        </Csec>
        {caps.length > 0 && (
          <Csec>
            <StockColumns
              items={caps.map((x) => ({ key: x.serviceId, label: x.serviceName, value: x.slotsUsed, max: x.slotsTotal, tone: !x.benchOk ? "bad" : x.low ? "warn" : undefined, active: x.serviceId === c?.serviceId, href: `${BASE}?service=${x.serviceId}` }))}
              totalLabel="Client slots"
              total={`${total[0]}/${total[1]}`}
              totalSub={`${total[1] - total[0]} free · ${m.contractors_confirmed ?? 0} on the bench`}
            />
          </Csec>
        )}
        <div className="console-split">
          {c ? (
            <Csec>
              <div className="csec-head">
                <span className="csec-title">{c.serviceName}</span>
                <span className="csec-right">
                  <Badge tone={c.benchOk ? "good" : "warn"}>{c.benchOk ? "Bench OK" : c.confirmed ? "No backup" : "No one yet"}</Badge>
                  {c.low && <Badge tone="warn">Low on slots</Badge>}
                </span>
              </div>
              <Ledger
                rows={[
                  ["Contractors on the bench", `${c.confirmed} · minimum ${rules.minBench}`, c.benchOk ? undefined : "warn"],
                  ["Slots available", c.slotsTotal],
                  ["Slots used (by slot weight)", c.slotsUsed],
                  ["Slots free", c.slotsFree, c.low ? "warn" : "good"],
                  next && ["Needed for the next phase", c.needed !== null ? `${c.needed} contractors` : "—"],
                  c.gap ? ["Recruit", `${c.gap} more${c.recruitBy ? ` · start by ${longDate(c.recruitBy)}` : " · date once launch is set"}`, "warn"] : null,
                ]}
              />
              <p className="csec-title" style={{ margin: "20px 0 6px" }}>
                Bench contractors · slots each
              </p>
              {c.bench.length === 0 && <p className="muted small">No confirmed contractor has quoted this service yet.</p>}
              {c.bench.map((b) => (
                <AutoSubmitForm key={b.contractorServiceId} action={setContractorSlotsAction} className="editrow">
                  <BackTo path={back} />
                  <HiddenFields values={{ id: b.contractorServiceId }} />
                  <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                    <Avatar name={b.name} size={26} active />
                    <Link href={`/incrementum/contractors/${b.contractorId}`}>{b.name}</Link>
                  </span>
                  <span className="muted small">{b.capacitySlots !== null ? "declared" : `default ${rules.slotsPer}`}</span>
                  <input className="input" type="number" name="slots" min={0} step={1} defaultValue={b.capacitySlots ?? ""} placeholder={String(rules.slotsPer)} aria-label={`${b.name} slots for ${c.serviceName}`} />
                </AutoSubmitForm>
              ))}
              <p className="csec-title" style={{ margin: "20px 0 6px" }}>
                Clients on this service · slot weight
              </p>
              {c.clients.length === 0 && <p className="muted small">No active client uses it yet.</p>}
              {c.clients.map((e) => (
                <AutoSubmitForm key={e.engagementId} action={setSlotWeightAction} className="editrow">
                  <BackTo path={back} />
                  <HiddenFields values={{ id: e.engagementId }} />
                  <Link href={`/incrementum/clients/${e.engagementId}`}>{e.name}</Link>
                  <span className="muted small">{e.businessSize ? BUSINESS_SIZE_LABELS[e.businessSize as BusinessSize] : "size not set"}</span>
                  <input className="input" type="number" name="slotWeight" min={0.5} step={0.5} defaultValue={e.slotWeight} aria-label={`${e.name} slot weight`} />
                </AutoSubmitForm>
              ))}
            </Csec>
          ) : (
            <Csec>
              <p className="muted small">Put a monthly service in a live package to see its capacity.</p>
            </Csec>
          )}
          <Csec>
            <div className="csec-head">
              <SlidersHorizontal size={14} style={{ color: "var(--t-accent)" }} />
              <span className="csec-title">Thresholds</span>
            </div>
            <form className="form-grid" action={saveCapacityThresholdsAction}>
              <BackTo path={back} />
              <Field label="Slots per contractor (until declared)">
                <input className="input" name="defaultSlotsPerContractor" type="number" min={1} step="any" defaultValue={rules.slotsPer} />
              </Field>
              <Field label="Minimum bench per service">
                <input className="input" name="minBench" type="number" min={0} defaultValue={rules.minBench} />
              </Field>
              <Field label="Warn when free slots ≤">
                <input className="input" name="lowSlotsWarn" type="number" min={0} defaultValue={rules.lowSlots} />
              </Field>
              <Field label={`Days to recruit${measured ? ` (measured: ${measured})` : ""}`}>
                <input className="input" name="defaultRecruitDays" type="number" min={1} defaultValue={rules.recruitDays} />
              </Field>
              <div className="form-actions">
                <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                  Save thresholds
                </SubmitButton>
              </div>
            </form>
            <p className="csec-title" style={{ margin: "20px 0 8px" }}>
              How it works
            </p>
            <ul className="howto">
              <li>
                <b>Slots available</b> = each bench contractor&apos;s declared slots for the service, or the default until they declare one. Set it on their quote, or right here.
              </li>
              <li>
                <b>Slots used</b> = active clients with that service assigned, counted at their slot weight (a bigger client can take 1.5 or 2).
              </li>
              <li>
                <b>Bench OK</b> when at least the minimum bench has quoted it, so every service has a backup.
              </li>
              <li>
                <b>Needed</b> = next phase&apos;s clients ÷ average slots per contractor, never below the minimum bench. <b>Recruit by</b> = the phase&apos;s target date − days to recruit ({daysToRecruit} {measured ? "measured" : "until measured"}).
              </li>
            </ul>
          </Csec>
        </div>
        {(caps.length > 0 || clientGoals.length > 0) && (
          <Csec>
            <p className="csec-title" style={{ marginBottom: 8 }}>
              Forecast in plain words
            </p>
            <div className="checklist">
              {caps.map((x) => (
                <div key={x.serviceId}>
                  <span className={x.gap ? "miss" : "ok"}>{x.gap ? "!" : "✓"}</span>
                  <span>
                    {x.gap
                      ? `${x.serviceName}: ${x.gap} more contractor${x.gap === 1 ? "" : "s"} for Phase ${next?.number ?? "next"} (${next?.clientMax ?? next?.clientMin ?? "?"} clients)${x.targetDate && x.recruitBy ? ` by ${longDate(x.targetDate)}; start sourcing by ${longDate(x.recruitBy)}.` : ". Dates follow once the launch date is set."}`
                      : `${x.serviceName}: the bench covers the next phase.`}
                  </span>
                </div>
              ))}
              {clientGoals.map((g) => {
                const needed = contractorsNeeded(n0(g.target), 1, rules.slotsPer, rules.minBench);
                const gap = Math.max(0, needed - (m.contractors_confirmed ?? 0));
                return (
                  <div key={g.id}>
                    <span className={gap ? "miss" : "ok"}>{gap ? "!" : "✓"}</span>
                    <span>
                      Goal &quot;{g.title}&quot;: {n0(g.target)} clients needs about {needed} contractors.{" "}
                      {gap ? `Recruit ${gap} more, starting by ${longDate(addDays(g.periodEnd!, -daysToRecruit))}.` : "You have enough."}
                    </span>
                  </div>
                );
              })}
            </div>
          </Csec>
        )}
      </Console>
      <IncrementumReadySignal />
    </div>
  );
}

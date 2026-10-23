// The Path view (Change-Plan-20k-Stretch.md §6.6, top of Goals): monthly
// profit broken into the drivers that make it, each now → target, for the
// base or the stretch. Every number comes from computePath(); lines still
// running on Settings' planning assumptions are tagged "plan".
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { fmtDriver, type PathLine, type PathView } from "@/lib/incrementum/compute";
import { LEAD_SOURCE_LABELS } from "@/lib/incrementum/registry";
import { money } from "@/lib/incrementum/format";
import { Csec, LevelBars, Ledger, Priv, Seg, Badge } from "./kit";
import { longDate } from "./helpers";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
const one = (v: number | null) => (v === null ? "—" : (Math.round(v * 10) / 10).toString());
const ratio = (now: number | null, target: number) => (now === null || target <= 0 ? 0 : Math.min(1, now / target));

export function monthYear(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00Z`).toLocaleString("en-NZ", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Mar 2027", or why there's no date yet. */
export function etaLabel(p: PathView, line: PathLine): string {
  const eta = p.eta[line];
  if (eta) return monthYear(eta);
  return p.newPerMonth.now ? "not at this pace" : "no pace yet";
}

function Tag({ live }: { live: boolean }) {
  return live ? null : <Badge>plan</Badge>;
}

export function PathPanel({ s, line, base }: { s: IncrementumSnapshot; line: PathLine; base: string }) {
  const p = s.path[line];
  const st = s.state;
  const threeAgo = new Date(`${st.today}T12:00:00Z`);
  threeAgo.setUTCDate(threeAgo.getUTCDate() - 91);
  const from = threeAgo.toISOString().slice(0, 10);
  const leadSource = new Map(st.leads.map((l) => [l.id, l.source]));
  const bySource = new Map<string, number>();
  for (const e of st.engagements) {
    if (e.deletedAt || !e.startDate || e.startDate < from || e.startDate > st.today) continue;
    const src = (e.leadId && leadSource.get(e.leadId)) || "manual";
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
  }
  const sources = [...bySource.entries()].map(([k, v]) => `${LEAD_SOURCE_LABELS[k as keyof typeof LEAD_SOURCE_LABELS] ?? k} ${v}`).join(" · ");

  return (
    <>
      <Csec
        title={
          <span className="row" style={{ gap: 12 }}>
            Path to
            <Seg
              small
              value={line}
              options={[
                ["base", <>Base <Priv>{money(s.path.base.target)}</Priv></>, base],
                ["stretch", <>Stretch <Priv>{money(s.path.stretch.target)}</Priv></>, `${base}?line=stretch`],
              ]}
            />
          </span>
        }
        right={<span className="muted small">by {p.byDate ? longDate(p.byDate) : "—"} · {Math.round(p.monthsLeft)} months left</span>}
      >
        <LevelBars
          rows={[
            { label: "Monthly profit", value: ratio(p.profitNow, p.target), right: <Priv>{`${money(p.profitNow)} → ${money(p.target)}`}</Priv> },
            { label: "Active clients", value: ratio(p.activeNow, p.clientsNeeded), right: `${p.activeNow} → ${p.clientsNeeded}` },
            { label: "Profit per client", value: ratio(p.perClient.now, p.perClient.plan), right: <Priv>{`${fmtDriver(p.perClient.now, "currency")} → ${money(p.perClient.plan)}`}</Priv> },
            { label: "New clients / month", value: ratio(p.newPerMonth.now, p.newPerMonth.needed), right: `${one(p.newPerMonth.now)} → ${one(p.newPerMonth.needed)}` },
          ]}
        />
      </Csec>
      <div className="console-split">
        <Csec>
          <p className="csec-title" style={{ marginBottom: 8 }}>
            What makes it
          </p>
          <Ledger
            rows={[
              [
                "Active clients",
                <>
                  {p.activeNow} → {p.clientsNeeded} <small className="muted">← new {one(p.newPerMonth.now)} / {one(p.newPerMonth.needed)} a month · stay {one(p.stay.used)} mo</small> <Tag live={p.stay.live} />
                </>,
              ],
              [
                "Profit per client",
                <>
                  <Priv>{`${fmtDriver(p.perClient.now, "currency")} → ${money(p.perClient.plan)}`}</Priv>{" "}
                  <small className="muted">
                    ← Partner {pct(p.partnerShare.now)} → {pct(p.partnerShare.plan)} · add-ons {pct(p.addonAttach.now)} → {pct(p.addonAttach.plan)}
                  </small>{" "}
                  <Tag live={p.perClient.live} />
                </>,
              ],
              [
                "New clients / month",
                <>
                  {one(p.newPerMonth.now)} → {one(p.newPerMonth.needed)} <small className="muted">← {sources || "ads · outreach · referrals · builds"}</small>
                </>,
              ],
              [
                "One-off profit (3-mo avg, not counted)",
                <>
                  <Priv>{money(p.oneOff3m)}</Priv> <small className="muted">→ <Priv>{money(p.oneOffToAds)}</Priv> feeds the ad budget</small>
                </>,
              ],
            ]}
          />
          <p className="muted small" style={{ marginTop: 8 }}>
            Clients needed include ~10% of profit going back into ads. New clients a month = the gap spread over the months left, plus replacing clients who leave on the way.
          </p>
        </Csec>
        <Csec>
          <p className="csec-title" style={{ marginBottom: 8 }}>
            Right now
          </p>
          <Ledger
            rows={[
              ["Biggest lever", p.lever ? `${p.lever.label}: ${fmtDriver(p.lever.now, p.lever.unit)} vs ${fmtDriver(p.lever.target, p.lever.unit)}` : "Nothing behind pace yet", p.lever ? "warn" : undefined],
              ["Contractors needed", `${p.contractorsNow} confirmed → ~${p.contractorsNeeded}`, undefined, "/incrementum/capacity"],
              ["Max's hours / week", `${p.hoursWeekNow === null ? "—" : p.hoursWeekNow.toFixed(1)} now → ~${Math.round(p.hoursWeekAtTarget)} at ${p.clientsNeeded} clients`],
              ["Suggested ad budget", p.suggestedAdBudget === null ? "Runway (no profit to reinvest yet)" : <Priv>{`${money(p.suggestedAdBudget)}/month`}</Priv>, undefined, "/incrementum/analytics"],
              ["At current pace", `Base ${etaLabel(s.path.base, "base")} · Stretch ${etaLabel(s.path.stretch, "stretch")}`],
            ]}
          />
          {p.lever && <p className="muted small" style={{ marginTop: 8 }}>{p.lever.hint}</p>}
        </Csec>
      </div>
    </>
  );
}

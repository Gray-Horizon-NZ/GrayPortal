"use client";
// Port of the terminal concept's Clients (OS/grayportal-terminal-concept/src/
// screens/Clients.jsx). Same tiles, list and filters on real clients. Added
// beneath: the prospects list and "add prospect" the real page always had,
// built from the concept's own Panel/table/Modal parts.
import { useState } from "react";
import { Users, LayoutGrid, List, Search, Plus, Building2 } from "lucide-react";
import { useStore } from "../store";
import { money, fmtDate, clientMrr, clientSetupTotal } from "../format";
import { PageHead, Panel, Priv, Meter, TrendGlyph, BrandBanner, Badge, Seg, Modal, go } from "../ui";
import { createCompanyAction } from "@/app/(app)/companies/actions";

// Master Control Terminal tile. Revenue = this client's share of total MRR;
// Health = the computed health score (payment, tasks, activity, momentum),
// shown in one neutral colour — the score itself is being reworked (docs/Terminal-UI-Followups.md).
export function ClientCard({ client: c, minimal, mrrTotal }) {
  const mrr = clientMrr(c);
  const share = mrrTotal > 0 ? (mrr / mrrTotal) * 100 : 0;
  return (
    <button className="tile" onClick={() => go(`/clients/${c.id}`)}>
      <div className="tile-name">
        <span>{c.name}</span>
        <Badge tone={statusTone(c.status)}>{c.status}</Badge>
      </div>
      {!minimal && <BrandBanner client={c} height={104} />}
      <div className="tile-body">
        <div className="tile-meter">
          <span>Revenue</span>
          <Meter value={share} label="Share of MRR" />
          <b><Priv>{mrr ? `${money(mrr)}` : "—"}</Priv></b>
        </div>
        <div className="tile-meter">
          <span>Health</span>
          <Meter value={c.health.score} tone="neutral" label="Health score" />
          <b>
            {c.health.score} <TrendGlyph trend={c.health.trend} />
          </b>
        </div>
        <div className="tile-meta">
          <span>{c.company.industry.split(" · ")[1] || c.company.industry || "—"}</span>
          <span>{c.nextPayment ? <>Next bill {fmtDate(c.nextPayment)}</> : "No billing"}</span>
        </div>
      </div>
      <div className="tile-manage">Manage account</div>
    </button>
  );
}

export const statusTone = (s) =>
  ({ Live: "good", Retainer: "good", Onboarded: "accent", "Active build": "accent", "Compliance review": "warn", "Internal product": undefined })[s];

export default function Clients() {
  const { clients, prospects = [], prefs, setPref } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const mrrTotal = clients.reduce((a, c) => a + clientMrr(c), 0);

  const shown = clients.filter((c) => {
    const hit = !q || `${c.name} ${c.mainContact.name} ${c.company.industry}`.toLowerCase().includes(q.toLowerCase());
    const f = filter === "all" || (filter === "retainer" ? clientMrr(c) > 0 : filter === "attention" ? c.health.score < 60 : true);
    return hit && f;
  });
  const shownProspects = prospects.filter((p) => !q || `${p.name} ${p.industry} ${p.region}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="screen">
      <PageHead title="Clients" sub={`${clients.length} accounts · ${clients.filter((c) => clientMrr(c) > 0).length} on retainer`}>
        <div className="search" style={{ margin: 0, maxWidth: 260, display: "flex" }}>
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" aria-label="Search clients" />
        </div>
        <Seg value={filter} onChange={setFilter} options={[["all", "All"], ["retainer", "Retainer"], ["attention", "Needs attention"]]} />
        <Seg value={prefs.clientView} onChange={(v) => setPref("clientView", v)} options={[["grid", <LayoutGrid size={14} key="g" />], ["list", <List size={14} key="l" />]]} />
        <button className="btn btn-primary" onClick={() => go("/clients/onboard")}><Plus size={14} /> Onboard client</button>
      </PageHead>

      {prefs.clientView === "grid" ? (
        <div className="tiles">
          {shown.map((c) => (
            <ClientCard key={c.id} client={c} minimal={prefs.minimalClientCards} mrrTotal={mrrTotal} />
          ))}
        </div>
      ) : (
        <Panel title="Client roster" icon={Users} pad={false} right={`${shown.length} shown`}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Main contact</th>
                  <th>Services</th>
                  <th className="num">MRR</th>
                  <th className="num">Setup fees</th>
                  <th>Health</th>
                  <th>Next bill</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} data-click onClick={() => go(`/clients/${c.id}`)}>
                    <td>
                      <b className="strong">{c.name}</b>
                    </td>
                    <td><Priv>{c.mainContact.name || "—"}</Priv></td>
                    <td className="muted">{c.services.filter((s) => s.status === "active").length} active</td>
                    <td className="num"><Priv>{clientMrr(c) ? money(clientMrr(c)) : "—"}</Priv></td>
                    <td className="num"><Priv>{money(clientSetupTotal(c))}</Priv></td>
                    <td>
                      <span className="healthcell">
                        <b className="strong">{c.health.score}</b>
                        <Meter value={c.health.score} tone="neutral" />
                        <TrendGlyph trend={c.health.trend} />
                      </span>
                    </td>
                    <td className="nowrap">{c.nextPayment ? fmtDate(c.nextPayment) : "—"}</td>
                    <td><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="num"><Priv>{money(mrrTotal)}</Priv></td>
                  <td className="num"><Priv>{money(clients.reduce((a, c) => a + clientSetupTotal(c), 0))}</Priv></td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Prospects" icon={Building2} pad={false} right={<button className="btn btn-sm" onClick={() => setAdding(true)}><Plus size={12} /> Add prospect</button>}>
        {shownProspects.length === 0 ? (
          <p className="muted small" style={{ padding: 16 }}>No prospects{q ? " match that search" : " yet"}.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Company</th><th>Industry</th><th>Region</th></tr></thead>
            <tbody>
              {shownProspects.map((p) => (
                <tr key={p.id} data-click onClick={() => go(`/companies/${p.id}`)}>
                  <td className="strong">{p.name}</td>
                  <td className="muted">{p.industry || "—"}</td>
                  <td className="muted">{p.region || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add prospect">
        <form
          className="stack"
          style={{ gap: 10 }}
          action={async (fd) => {
            await createCompanyAction(fd);
            setAdding(false);
          }}
        >
          <div className="form-grid">
            <label className="field"><span>Company name</span><input className="input" name="name" required /></label>
            <label className="field"><span>Source</span><input className="input" name="source" required placeholder="e.g. Referral" /></label>
            <label className="field"><span>Industry</span><input className="input" name="industry" /></label>
            <label className="field"><span>Region</span><input className="input" name="region" /></label>
            <label className="field"><span>Website</span><input className="input" name="website" /></label>
            <label className="field"><span>Size band</span><input className="input" name="sizeBand" /></label>
          </div>
          <label className="field"><span>Notes</span><textarea className="textarea" name="notes" /></label>
          <button className="btn btn-primary" type="submit"><Plus size={14} /> Add prospect</button>
        </form>
      </Modal>
    </div>
  );
}

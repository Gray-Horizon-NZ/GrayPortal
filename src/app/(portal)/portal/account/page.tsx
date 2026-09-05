import {
  getEnabledFeatureKeys,
  listPortalToolStack,
  listPortalReferrals,
  getReferralStats,
  listPortalMeetingSummaries,
  listPortalInvoices,
} from "@/lib/dal/portal";
import { submitPortalReferralAction } from "../referrals/actions";
import SubmitButton from "@/components/ui/SubmitButton";

const STATUS_TAG: Record<string, string> = {
  PAID: "ghp-good",
  AUTHORISED: "ghp-warn",
  SUBMITTED: "ghp-warn",
  DRAFT: "",
  VOIDED: "ghp-danger",
  DELETED: "ghp-danger",
};

export default async function PortalAccountPage() {
  const enabled = await getEnabledFeatureKeys();
  const has = (key: string) => enabled.includes(key as (typeof enabled)[number]);

  const [tools, invoices, referrals, referralStats, meetings] = await Promise.all([
    has("tool_stack") ? listPortalToolStack() : Promise.resolve([]),
    has("invoices") ? listPortalInvoices() : Promise.resolve([]),
    has("referrals") ? listPortalReferrals() : Promise.resolve([]),
    has("referrals") ? getReferralStats() : Promise.resolve(null),
    has("meeting_summaries") ? listPortalMeetingSummaries() : Promise.resolve([]),
  ]);
  const outstandingInvoices = invoices.filter((i) => i.status === "AUTHORISED" || i.status === "SUBMITTED");

  const nothingEnabled = !has("tool_stack") && !has("invoices") && !has("referrals") && !has("meeting_summaries");

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Account</h1>
        <div className="ghp-sub">Tool stack, invoices, referrals and meeting summaries</div>
      </div>

      {nothingEnabled && <p className="ghp-empty">No account sections are enabled for your account yet.</p>}

      <div className="ghp-widget-grid">
        <div>
          {has("tool_stack") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Tool stack</div>
                <div className="ghp-n">{tools.length} connected</div>
              </div>
              {tools.map((t) => (
                <div key={t.id} className="ghp-row">
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.toolName}</div>
                    {t.category && <div style={{ fontSize: 11, color: "var(--ghp-text-dim)" }}>{t.category}</div>}
                  </div>
                  <span className={`ghp-tag ${t.status === "current" ? "ghp-good" : "ghp-warn"}`}>{t.status}</span>
                </div>
              ))}
              {tools.length === 0 && <p className="ghp-empty">No tools logged yet.</p>}
            </div>
          )}

          {has("invoices") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Invoices</div>
                <div className="ghp-n">{outstandingInvoices.length} outstanding</div>
              </div>
              {invoices.length > 0 ? (
                <table className="ghp-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Status</th>
                      <th className="ghp-r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <div className="ghp-proj-name">
                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—"}
                          </div>
                        </td>
                        <td>
                          <span className={`ghp-tag ${STATUS_TAG[inv.status] ?? ""}`}>
                            {inv.status === "PAID" ? "Paid" : inv.dueDate ? `Due ${inv.dueDate}` : inv.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="ghp-r">
                          <span className="ghp-serif" style={{ fontSize: 15 }}>
                            {inv.total ? `$${Number(inv.total).toLocaleString("en-NZ")}` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ghp-empty">No invoices yet.</p>
              )}
            </div>
          )}
        </div>

        <div>
          {has("referrals") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Referrals</div>
                <div className="ghp-n">program active</div>
              </div>
              <div className="ghp-ref-hero">
                <div className="ghp-card">
                  <div className="ghp-l">Total</div>
                  <div className="ghp-v">{referralStats?.totalReferrals ?? 0}</div>
                </div>
                <div className="ghp-card">
                  <div className="ghp-l">Active discount</div>
                  <div className="ghp-v">{referralStats?.activeDiscountPercent ?? 0}%</div>
                </div>
                <div className="ghp-card">
                  <div className="ghp-l">Submitted</div>
                  <div className="ghp-v">{referrals.length}</div>
                </div>
              </div>
              <div style={{ padding: "0 18px 18px" }}>
                <form action={submitPortalReferralAction} style={{ display: "flex", flexDirection: "column", gap: "var(--ghp-space-2)" }}>
                  <input className="ghp-input" name="referredName" placeholder="Who you're referring" required />
                  <textarea className="ghp-input" name="notes" placeholder="Notes (optional)" rows={2} />
                  <SubmitButton pendingLabel="Submitting…" className="ghp-btn">
                    Submit referral
                  </SubmitButton>
                </form>
              </div>
              {referrals.length > 0 && (
                <div style={{ borderTop: "1px solid var(--ghp-line)" }}>
                  {referrals.map((r) => (
                    <div key={r.id} className="ghp-row">
                      <span>{r.referredName}</span>
                      <span className="ghp-tag">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {has("meeting_summaries") && (
            <div className="ghp-panel-block">
              <div className="ghp-panel-head">
                <div className="ghp-t">Meeting summaries</div>
                <div className="ghp-n">{meetings.length ? "recent" : "none yet"}</div>
              </div>
              {meetings.map((m) => (
                <div key={m.id} className="ghp-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontWeight: 500 }}>{m.title}</span>
                    <span style={{ color: "var(--ghp-text-dim)", fontSize: 11 }}>
                      {new Date(m.occurredAt).toLocaleDateString("en-NZ")}
                    </span>
                  </div>
                  <p style={{ color: "var(--ghp-text-dim)", fontSize: 11.5 }}>{m.summary}</p>
                </div>
              ))}
              {meetings.length === 0 && <p className="ghp-empty">No meeting summaries yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

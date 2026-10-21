import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIncrementumSnapshot, type IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { computeNeed, quoteTotals } from "@/lib/incrementum/compute";
import PrintButton from "./PrintButton";
import "./proposal.css";

// Apexus-Incrementum (Max, 2026-10-21): the client proposal, built straight
// from a lead's or client's "Services & team" lines, so it can never
// disagree with the deal on the profile. Client-facing only: prices, never
// contractors, rates, markup or profit. Opened from the profile's "Apexus
// proposal" button; Save PDF uses the browser's print-to-PDF, like Apexus.
// Admin-only by construction: the snapshot is withIncrementum-scoped.

type Kind = "lead" | "client";

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const money = (n: number) => nzd.format(Math.round(n));

function subject(s: IncrementumSnapshot, kind: Kind, id: string) {
  if (kind === "lead") {
    const l = s.state.leads.find((x) => x.id === id && !x.deletedAt);
    if (!l) return null;
    const rows = s.state.needs.filter((n) => n.leadId === id && !n.engagementId);
    return { company: l.businessName, contact: l.contactName ?? l.businessName, adBudget: l.adBudget, rows, back: `/incrementum/leads/${id}` };
  }
  const e = s.state.engagements.find((x) => x.id === id && !x.deletedAt);
  if (!e) return null;
  const rows = s.state.needs.filter((n) => n.engagementId === id);
  const company = e.clientName ?? e.name;
  return { company, contact: company, adBudget: null, rows, back: `/incrementum/engagements/${id}` };
}

/** Package copy is written for Services & Pricing; tidy the one internal marker for a client's eyes. */
const forClient = (text: string) => text.replace(/\s*\(Max\)/g, " with Max");

async function load(params: Promise<{ kind: string; id: string }>) {
  const { kind, id } = await params;
  if (kind !== "lead" && kind !== "client") notFound();
  const s = await getIncrementumSnapshot();
  const sub = subject(s, kind, id);
  if (!sub) notFound();
  return { s, sub };
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string; id: string }> }): Promise<Metadata> {
  const { sub } = await load(params);
  // Becomes the default PDF filename in the browser's Save as PDF.
  return { title: `Gray Horizon Proposal · ${sub.company}` };
}

export default async function IncrementumProposal({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { s, sub } = await load(params);
  const views = sub.rows.map((n) => computeNeed(s.state, s.services, n)).sort((a, b) => Number(a.billing !== "monthly") - Number(b.billing !== "monthly"));
  const t = quoteTotals(views);
  const packageIds = [...new Set(views.map((v) => v.packageId).filter((x): x is string => Boolean(x)))];
  const packages = packageIds.map((pid) => s.packages.find((p) => p.id === pid)).filter((p): p is (typeof s.packages)[number] => Boolean(p));
  const title = packages.length === 1 ? packages[0].name : "Growth Proposal";
  const minTerm = packages.length ? Math.max(...packages.map((p) => p.minTermMonths)) : 3;
  const notice = packages.length ? Math.max(...packages.map((p) => p.noticeDays)) : 30;
  const date = new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "Pacific/Auckland" }).format(new Date());

  const brand = (
    <div className="brand">
      <div>
        <div className="brand-name">
          <span className="wm-gray">Gray</span>
          <span className="wm-horizon">Horizon</span>
        </div>
        <div className="brand-tag">Big Business Thinking, Built For NZ</div>
      </div>
      <div className="brand-meta">
        <strong>{title}</strong>, {sub.contact}
        <br />
        {sub.company} · {date}
      </div>
    </div>
  );
  const footer = (
    <div className="page-footer">
      <span>Gray Horizon · grayhorizon.nz</span>
      <span>Prepared by Gray Horizon</span>
    </div>
  );

  return (
    <div className="inc-proposal">
      <div className="toolbar">
        <a href={sub.back}>← Back to the profile</a>
        <span>Built live from the profile&apos;s services. Change them there, then reopen.</span>
        <PrintButton />
      </div>

      <div className="pages">
        <div className="page">
          <div className="page-body">
            {brand}
            <h1 className="doc-title">
              {title} <em>for {sub.contact}</em>
            </h1>
            <div className="doc-sub">
              {sub.company} · {date}
            </div>

            {views.length === 0 ? (
              <p className="doc-sub">Nothing on this profile yet. Add a package or services to build the proposal.</p>
            ) : (
              <>
                <div className="section-label">Investment Summary</div>
                <div className="invest-grid">
                  <div className="invest-card">
                    <div className="price-label">One-Time Setup</div>
                    <div className="price">{money(t.oneOffPrice)}</div>
                    <div className="price-desc">Billed upfront{t.waivedValue ? ` · ${money(t.waivedValue)} included free` : ""}</div>
                  </div>
                  <div className="invest-card">
                    <div className="price-label">Monthly Retainer</div>
                    <div className="price">{money(t.monthlyPrice)}/mo</div>
                    <div className="price-desc">Billed monthly in advance · {minTerm}-month minimum</div>
                  </div>
                  {sub.adBudget && (
                    <div className="invest-card">
                      <div className="price-label">Ad Spend</div>
                      <div className="price">{sub.adBudget}</div>
                      <div className="price-desc">Paid directly to Google / Meta</div>
                    </div>
                  )}
                </div>

                <div className="section-label">What&apos;s Included</div>
                <table className="items">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Cadence</th>
                      <th className="num">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map((v) => {
                      const qty = Number(v.quantity ?? 1);
                      return (
                        <tr key={v.id}>
                          <td>
                            {v.name}
                            {v.title && v.title !== v.name ? ` · ${v.title}` : ""}
                            {qty !== 1 ? ` × ${v.quantity}` : ""}
                          </td>
                          <td>{v.billing === "monthly" ? "Monthly" : "One-time"}</td>
                          <td className="num">
                            {v.waived ? (
                              <>
                                {v.listPrice !== null && <span className="was">{money(v.listPrice)}</span>}
                                Included
                              </>
                            ) : v.price === null ? (
                              "To be quoted"
                            ) : (
                              `${money(v.price)}${v.billing === "monthly" ? "/mo" : ""}`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(t.monthlyDiscount > 0 || t.oneOffDiscount > 0) && (
                  <div className="discount-line">
                    {t.monthlyDiscount > 0 && <span>Bundle saving: −{money(t.monthlyDiscount)}/mo</span>}
                    {t.oneOffDiscount > 0 && <span>Setup bundle saving: −{money(t.oneOffDiscount)}</span>}
                  </div>
                )}

                <div className="terms">
                  Minimum term: {minTerm} months, then month to month with {notice} days&apos; notice. Setup is billed upfront and the monthly retainer in advance. Ad spend is paid
                  directly to Google / Meta on your own account, separate from this proposal; you own your ad accounts, analytics and website. Work outside the scope below is quoted
                  separately. Pricing is reviewed annually with 30 days&apos; notice.
                </div>
              </>
            )}
          </div>
          {footer}
        </div>

        {packages.some((p) => p.inclusions || p.deliverables || p.exclusions) && (
          <div className="page">
            <div className="page-body">
              {brand}
              {packages.map((p) => (
                <div key={p.id}>
                  <div className="section-label">What you get: {p.name}</div>
                  <div className="deliv">
                    {[p.inclusions, p.deliverables, p.exclusions].map((text, i) => (text ? <div className="deliv-col" key={i}>{forClient(text)}</div> : null))}
                  </div>
                </div>
              ))}
            </div>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

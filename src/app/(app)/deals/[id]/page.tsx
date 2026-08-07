import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, CalendarX, Building2, User, Mail, Phone, Handshake } from "lucide-react";
import { getDeal } from "@/lib/dal/deals";
import { getCompany } from "@/lib/dal/companies";
import { getContact } from "@/lib/dal/contacts";
import { listEmailTemplates } from "@/lib/dal/emails";
import { STAGES } from "@/config/pipeline";
import { changeStageAction, deleteDealAction, logDealActivityAction, sendDealEmailAction } from "../actions";
import EmailComposeFields from "@/components/EmailComposeFields";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StageStepper from "@/components/ui/StageStepper";
import Breadcrumb from "@/components/ui/Breadcrumb";
import RecordHeader from "@/components/ui/RecordHeader";

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailSent?: string; emailError?: string }>;
}) {
  const { id } = await params;
  const { emailSent, emailError } = await searchParams;
  const data = await getDeal(id);
  if (!data) notFound();
  const { deal, activities, tasks } = data;
  const [templates, companyData, contactData] = await Promise.all([
    listEmailTemplates(),
    deal.companyId ? getCompany(deal.companyId) : Promise.resolve(null),
    deal.primaryContactId ? getContact(deal.primaryContactId) : Promise.resolve(null),
  ]);
  const company = companyData?.company ?? null;
  const contact = contactData?.contact ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }} className="gh-animate-fade-up">
      <Breadcrumb items={[{ label: "Deals", href: "/pipeline?view=list" }, { label: deal.valueNzd ? `$${deal.valueNzd} NZD` : "Value TBC" }]} />

      <RecordHeader
        icon={Handshake}
        title={deal.valueNzd ? `$${deal.valueNzd} NZD` : "Value TBC"}
        meta={
          <>
            {deal.syncState === "failed" && <Badge status="danger" icon={CalendarX}>Calendar sync failed</Badge>}
            {deal.syncState === "synced" && <Badge status="success" icon={CalendarCheck}>Synced to Calendar</Badge>}
          </>
        }
        actions={
          <form action={deleteDealAction.bind(null, deal.id, deal.companyId ?? undefined)}>
            <button className="gh-btn-secondary" type="submit" style={{ color: "var(--gh-danger)" }}>
              Remove deal
            </button>
          </form>
        }
      />

      {emailSent && <p style={{ color: "var(--gh-success)" }}>Email sent and logged.</p>}
      {emailError && <p style={{ color: "var(--gh-danger)" }}>Couldn&apos;t send: {emailError}</p>}

      <Card>
        <StageStepper stage={deal.stage} />
      </Card>

      <div className="gh-deal-grid" style={{ gap: "var(--gh-space-4)", alignItems: "start" }}>
        {/* Left — company / contact info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
          {company && (
            <Card eyebrow="Company" title={<Link href={`/companies/${company.id}`}>{company.name}</Link>}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", color: "var(--gh-text-muted)" }}>
                  <Building2 size={14} strokeWidth={1.75} /> {company.industry ?? "—"}
                </span>
              </div>
            </Card>
          )}
          {contact && (
            <Card eyebrow="Primary contact" title={`${contact.firstName} ${contact.lastName}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)", fontSize: "var(--gh-text-sm)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", color: "var(--gh-text-muted)" }}>
                  <User size={14} strokeWidth={1.75} /> {contact.roleTitle ?? "—"}
                </span>
                {contact.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", color: "var(--gh-text-muted)" }}>
                    <Mail size={14} strokeWidth={1.75} /> {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--gh-space-2)", color: "var(--gh-text-muted)" }}>
                    <Phone size={14} strokeWidth={1.75} /> {contact.phone}
                  </span>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Center — next action, activity timeline, forms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
          <Card eyebrow="Next action">
            <p style={{ fontWeight: 500 }}>{deal.nextAction}</p>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>Due {deal.nextActionDate}</p>
          </Card>

          <Card eyebrow="Activity timeline">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activities
                .slice()
                .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                .map((a, i, arr) => (
                  <div key={a.id} style={{ display: "flex", gap: "var(--gh-space-3)", paddingBottom: i === arr.length - 1 ? 0 : "var(--gh-space-3)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, background: "var(--gh-accent)", flexShrink: 0, marginTop: 5 }} />
                      {i !== arr.length - 1 && <span style={{ width: 1, flex: 1, background: "var(--gh-border)", marginTop: 4 }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textTransform: "capitalize" }}>
                        {a.type} · {new Date(a.occurredAt).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}
                      </p>
                      <p style={{ fontSize: "var(--gh-text-sm)" }}>{a.body}</p>
                    </div>
                  </div>
                ))}
              {activities.length === 0 && (
                <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No activity yet.</p>
              )}
            </div>
          </Card>

          <details className="gh-card">
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Send email</summary>
            <form action={sendDealEmailAction.bind(null, deal.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <EmailComposeFields templates={templates} />
              <button className="gh-btn-primary" type="submit">Send to primary contact</button>
            </form>
          </details>
          <details className="gh-card">
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>Log activity</summary>
            <form action={logDealActivityAction.bind(null, deal.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <select className="gh-input" name="type" defaultValue="note">
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
              </select>
              <textarea className="gh-input" name="body" placeholder="What happened" rows={3} />
              <input className="gh-input" name="outcome" placeholder="Outcome" />
              <button className="gh-btn-primary" type="submit">Log activity</button>
            </form>
          </details>
        </div>

        {/* Right — tasks + stage change */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
          <Card eyebrow="Tasks">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
              {tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--gh-text-sm)" }}>
                  <span>{t.title}</span>
                  <Badge status={t.status === "done" ? "success" : "neutral"}>{t.status}</Badge>
                </div>
              ))}
              {tasks.length === 0 && <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>No tasks yet.</p>}
            </div>
          </Card>

          <Card eyebrow="Change stage">
            <form action={changeStageAction.bind(null, deal.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
              <select className="gh-input" name="stage" defaultValue={deal.stage}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input className="gh-input" name="closeReason" placeholder="Close reason (required if moving to Lost)" />
              <button className="gh-btn-secondary" type="submit">Update stage</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

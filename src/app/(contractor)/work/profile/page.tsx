import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { money, shortDate } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import { Head, Flash } from "@/components/contractor/ui";
import { updateProfileAction } from "../actions";

export default async function MyProfile({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const w = await getMyWorkspace();
  const me = w.me;
  if (!me) {
    return (
      <div style={{ maxWidth: 700 }}>
        <Head eyebrow="Me" title={<>Profile</>} />
        <p style={{ color: "var(--gh-text-muted)", marginTop: "var(--gh-space-4)" }}>Your profile isn&apos;t linked yet. Ask Max to finish setting you up.</p>
      </div>
    );
  }
  const field = (name: string, label: string, value: string | null, type = "text") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
      {label}
      <input className="gh-input" name={name} type={type} defaultValue={value ?? ""} />
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 900 }}>
      <Head eyebrow="Me" title={me.name} lede={me.public_title ?? me.specialty ?? undefined} />
      <Flash ok={ok} error={error} />
      <div className="gh-grid-joined gh-grid-joined--2">
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <p className="gh-panel-title">Your team card</p>
          <form action={updateProfileAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
            <input type="hidden" name="_back" value="/work/profile" />
            {field("publicTitle", "Title (shown on the team page)", me.public_title)}
            {field("photoUrl", "Photo URL", me.photo_url, "url")}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
              Short bio
              <textarea className="gh-input" name="bio" defaultValue={me.bio ?? ""} rows={4} />
            </label>
            {field("phone", "Phone", me.phone)}
            {field("location", "Location", me.location)}
            {field("portfolioUrl", "Portfolio", me.portfolio_url)}
            {field("skills", "Skills (comma-separated)", (me.skills ?? []).join(", "))}
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
          </form>
        </div>
        <div className="gh-grid-cell" style={{ gap: "var(--gh-space-3)" }}>
          <p className="gh-panel-title">Your rates</p>
          {w.quotes.length === 0 ? (
            <p style={{ color: "var(--gh-text-muted)" }}>None recorded yet.</p>
          ) : (
            w.quotes.map((q) => (
              <p key={q.id} style={{ fontSize: "var(--gh-text-sm)", display: "flex", justifyContent: "space-between" }}>
                <span>{q.service_name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(q.rate)}/{q.rate_type === "monthly" ? "mo" : q.rate_type}
                  {q.capacity_slots ? ` · ${q.capacity_slots} clients` : ""}
                </span>
              </p>
            ))
          )}
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>To change a rate, talk to Max. Agreed rates are locked per client.</p>
          <p className="gh-panel-title" style={{ marginTop: "var(--gh-space-3)" }}>
            Agreements
          </p>
          <p style={{ fontSize: "var(--gh-text-sm)" }}>Pay-when-paid: {me.pay_when_paid_accepted_at ? `accepted ${shortDate(me.pay_when_paid_accepted_at, true)}` : "not recorded"}</p>
          <p style={{ fontSize: "var(--gh-text-sm)" }}>Non-solicit: {me.non_solicit_signed_at ? `signed ${shortDate(me.non_solicit_signed_at, true)}` : "not recorded"}</p>
          {me.notice_period_days ? <p style={{ fontSize: "var(--gh-text-sm)" }}>Notice period: {me.notice_period_days} days</p> : null}
          {me.payment_terms ? <p style={{ fontSize: "var(--gh-text-sm)" }}>Payment terms: {me.payment_terms}</p> : null}
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { Home as HomeIcon, Rocket, Inbox, Briefcase, Users, Tags, ListChecks, Wallet, ArrowLeft } from "lucide-react";
import type { IncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { shortDate } from "@/lib/incrementum/format";
import SubmitButton from "@/components/ui/SubmitButton";
import { IdCard, Field } from "@/components/incrementum/terminal/kit";
import { Dialog, OpenDialog, RailButton, RailFolders, CurrentPathField } from "@/components/incrementum/terminal/client";
import { setLaunchDateAction } from "@/app/(incrementum)/incrementum/actions";

// Big block buttons for the pages used daily; everything else sits in
// folders underneath (RULES.md §3). Launch is a block until ads go live.
const PRIMARY = [
  { href: "/incrementum", label: "Home", icon: HomeIcon, exact: true },
  { href: "/incrementum/launch", label: "Launch", icon: Rocket, preOnly: true },
  { href: "/incrementum/leads", label: "Leads", icon: Inbox, count: "leads" },
  { href: "/incrementum/clients", label: "Clients", icon: Briefcase },
  { href: "/incrementum/contractors", label: "Contractors", icon: Users },
  { href: "/incrementum/services", label: "Services & Pricing", icon: Tags },
  { href: "/incrementum/tasks", label: "Tasks", icon: ListChecks, count: "tasks" },
  { href: "/incrementum/payouts", label: "Payouts", icon: Wallet, count: "payouts" },
] as const;

const FOLDERS: { label: string; items: [string, string, string?, "liveOnly"?][] }[] = [
  { label: "Plan", items: [["Goals", "/incrementum/goals"], ["Roadmap", "/incrementum/roadmap"], ["Weekly review", "/incrementum/review", "review"], ["Launch checklist", "/incrementum/launch", undefined, "liveOnly"]] },
  { label: "Deliver", items: [["Capacity", "/incrementum/capacity"], ["Playbooks", "/incrementum/playbooks"]] },
  { label: "Learn", items: [["Analytics", "/incrementum/analytics"], ["Experiments", "/incrementum/experiments"], ["Archive", "/incrementum/archive"]] },
  { label: "System", items: [["Settings", "/incrementum/settings"]] },
];

export const LAUNCH_DATE_DIALOG = "inc-launch-date";

/**
 * The rail: identity card (no art: the gold strip, PHASE → roadmap, ADS
 * LIVE → set/change/clear pop-up), the block buttons and the folders. With
 * no snapshot (still loading, or the page underneath errored) it shows the
 * plain buttons.
 */
export default function IncrementumRail({ s }: { s: IncrementumSnapshot | null }) {
  const mode = s?.mode ?? "pre";
  const counts: Record<string, number> = s
    ? {
        leads: s.metrics.leads_unanswered ?? 0,
        tasks: s.state.tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < s.state.today).length,
        payouts: s.state.cycles.filter((c) => !c.invoicedAt && c.month <= s.state.today).length,
        review: s.attention.some((a) => a.key.startsWith("review-")) ? 1 : 0,
      }
    : {};
  const cur = s?.phases.current ?? null;
  const launchDate = s?.state.settings.launchDate ?? null;
  return (
    <>
      <div className="rail-id">
        <IdCard
          strip="Project Incrementum"
          rows={[
            cur && [
              "Phase",
              <Link key="p" className="idcard-link" href="/incrementum/roadmap" title="Open the roadmap">
                {`${cur.number} · ${cur.name} (${cur.metCount}/${cur.criteria.length})`}
              </Link>,
            ],
            s && [
              "Ads live",
              <OpenDialog key="a" target={LAUNCH_DATE_DIALOG} className="idcard-link" title="Set or change the date ads go live">
                {launchDate ? shortDate(launchDate, true) : "TBC · set date"}
              </OpenDialog>,
            ],
          ]}
        />
      </div>
      {PRIMARY.filter((n) => !("preOnly" in n && n.preOnly && mode === "live")).map((n) => (
        <RailButton key={n.href} href={n.href} exact={"exact" in n && n.exact}>
          <n.icon size={16} strokeWidth={1.75} />
          {n.label}
          {"count" in n && counts[n.count] > 0 && <span className="count">{counts[n.count]}</span>}
        </RailButton>
      ))}
      <RailFolders
        folders={FOLDERS.map((f) => ({
          label: f.label,
          items: f.items.filter(([, , , only]) => !(only === "liveOnly" && mode === "pre")).map(([label, href, count]) => ({ label, href, count: count ? counts[count] : undefined })),
        }))}
      />
      <Link className="rail-return" href="/" title="Back to Gray Portal">
        <ArrowLeft size={14} /> Return to Gray Portal
      </Link>
      {s && <LaunchDateDialog date={launchDate} />}
    </>
  );
}

// "Ads live" on the rail card: set, change or clear the launch date. Every
// launch-relative date (phase targets, milestones, goals) follows it.
function LaunchDateDialog({ date }: { date: string | null }) {
  return (
    <Dialog id={LAUNCH_DATE_DIALOG} title={date ? "Change the ads-live date" : "Set the ads-live date"}>
      <p className="muted small">
        {date ? `Ads go live ${shortDate(date, true)}.` : "No date yet: launch-relative dates show as TBC."} Phase targets, milestones and goals that count from launch move with it. On the day, Home switches to live mode.
      </p>
      <form className="form-grid" action={setLaunchDateAction}>
        <Suspense fallback={null}>
          <CurrentPathField />
        </Suspense>
        <Field label="Ads go live" wide>
          <input className="input" type="date" name="launchDate" defaultValue={date ?? ""} required />
        </Field>
        <div className="form-actions">
          <SubmitButton className="btn btn-primary">{date ? "Save date" : "Set date"}</SubmitButton>
          {date && (
            <button type="submit" name="clear" value="1" formNoValidate className="linkbtn danger">
              Clear (back to TBC)
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

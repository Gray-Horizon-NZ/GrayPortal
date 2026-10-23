import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVerifiedUid, getCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { listMyNotifications } from "@/lib/dal/notifications";
import { listClients } from "@/lib/dal/clients";
import { listAllTasks } from "@/lib/dal/tasks";
import { listUnmatchedInboundEmails } from "@/lib/dal/emails";
import { listWebsiteInquiries } from "@/lib/dal/leads";
import { NOTIFICATION_TYPE_LABELS, notificationEntityHref } from "@/lib/notificationDisplay";
import TerminalShell from "@/terminal/Shell";
import { PREFS_COOKIE } from "@/terminal/prefs";
import LogoutButton from "./LogoutButton";
import SessionBootOverlay from "@/components/ui/SessionBootOverlay";
// Order matters: the concept stylesheet, then GrayPortal-only adapter rules.
import "./terminal.css";
import "./terminal-adapter.css";

const at = (d: Date | string) =>
  new Date(d).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  // Started now, awaited below — it doesn't depend on the caller lookup, so
  // the two round trips overlap instead of queueing.
  const notificationsPromise = listMyNotifications().catch(() => []);

  let callerLabel: string;
  let callerEmail = "";
  let callerRole: string = "contractor";
  try {
    const caller = await getCaller();
    callerLabel = caller.displayName ?? caller.email;
    callerEmail = caller.email;
    callerRole = caller.role;
  } catch (err) {
    if (err instanceof NotOnAllowlistError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--gh-space-4)",
            textAlign: "center",
            padding: "var(--gh-space-6)",
          }}
        >
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Not authorised
          </h1>
          <p style={{ color: "var(--gh-text-muted)", maxWidth: 420 }}>
            This Google account isn&apos;t on the Gray Portal allowlist. Contact an admin if you
            believe this is wrong.
          </p>
          <LogoutButton />
        </main>
      );
    }
    throw err;
  }

  // Contractors have their own workspace (/work); the admin shell is not
  // theirs even if a stale or claim-less session lands here (db/sql/031
  // already denies them the data — this keeps them out of the chrome too).
  if (callerRole === "contractor") redirect("/work");

  // The shell's own data, fetched in parallel. The layout only renders on a
  // full page load — client-side navigation re-renders just the page.
  const [notifications, inquiries, clients, tasks, unmatched] = await Promise.all([
    notificationsPromise,
    callerRole === "admin" ? listWebsiteInquiries().catch(() => []) : Promise.resolve([]),
    listClients().catch(() => []),
    listAllTasks().catch(() => []),
    callerRole === "admin" ? listUnmatchedInboundEmails().catch(() => []) : Promise.resolve([]),
  ]);

  let prefs = {};
  try {
    prefs = JSON.parse((await cookies()).get(PREFS_COOKIE)?.value ?? "{}");
  } catch {
    /* malformed cookie — defaults */
  }

  return (
    <>
      <SessionBootOverlay />
      <TerminalShell
        prefs={prefs}
        caller={{ name: callerLabel.split(/[\s@]/)[0], role: callerRole === "admin" ? "Admin" : callerRole, email: callerEmail }}
        counts={{ clients: clients.length, tasks: tasks.filter((t) => t.status !== "done").length, unread: unmatched.length }}
        data={{
          notifications: notifications.map((n) => ({
            id: n.id,
            body: NOTIFICATION_TYPE_LABELS[n.type] ?? n.type,
            at: at(n.createdAt),
            read: n.read,
            href: notificationEntityHref(n.payload),
          })),
          inquiries: inquiries.map((i) => ({
            id: i.id,
            companyName: i.companyName,
            firstName: i.firstName ?? "",
            lastName: i.lastName ?? "",
            email: i.email ?? "",
            phone: i.phone ?? "",
            website: i.website ?? "",
            message: i.message ?? "",
            at: new Date(i.createdAt).toLocaleString("sv-SE", { timeZone: "Pacific/Auckland" }),
            seen: false,
          })),
        }}
      >
        {children}
      </TerminalShell>
    </>
  );
}

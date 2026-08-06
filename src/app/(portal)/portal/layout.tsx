import { redirect } from "next/navigation";
import { getVerifiedUid, withCaller, NotOnAllowlistError } from "@/lib/dal/auth";
import { getEnabledFeatureKeys } from "@/lib/dal/portal";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/app/(app)/LogoutButton";

// Physically separate shell from (app) — no shared nav component that could
// leak an internal link into the client-facing surface by omission (Phase 2
// brief §3: route separation is defense in depth, not just a proxy.ts
// redirect). Gated the same way (app)/layout.tsx is: withCaller() re-checks
// the allowlist and role from Postgres on every request, independent of
// whatever proxy.ts already decided from the (routing-only) claim.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const uid = await getVerifiedUid();
  if (!uid) redirect("/login");

  let callerLabel: string;
  try {
    const caller = await withCaller(async (c) => c);
    if (caller.role !== "client") {
      redirect("/");
    }
    callerLabel = caller.displayName ?? caller.email;
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
            This Google account isn&apos;t on the Gray Portal allowlist. Contact Gray Horizon if
            you believe this is wrong.
          </p>
          <LogoutButton />
        </main>
      );
    }
    throw err;
  }

  const enabledFeatureKeys = await getEnabledFeatureKeys();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 200,
          flexShrink: 0,
          borderRight: "1px solid var(--gh-border)",
          padding: "var(--gh-space-8) 0",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gh-space-8)",
        }}
      >
        <div style={{ padding: "0 var(--gh-space-4)" }}>
          <p className="gh-eyebrow">Gray Horizon</p>
          <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
            Client portal
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
          <NavLink href="/portal">Home</NavLink>
          {enabledFeatureKeys.includes("tasks") && <NavLink href="/portal/tasks">Tasks</NavLink>}
          {enabledFeatureKeys.includes("documents") && (
            <NavLink href="/portal/documents">Documents</NavLink>
          )}
          {enabledFeatureKeys.includes("referrals") && (
            <NavLink href="/portal/referrals">Referrals</NavLink>
          )}
          {enabledFeatureKeys.includes("ideation") && (
            <NavLink href="/portal/ideation">Ideation</NavLink>
          )}
          {enabledFeatureKeys.includes("roadmap") && (
            <NavLink href="/portal/roadmap">Roadmap</NavLink>
          )}
          {enabledFeatureKeys.includes("meeting_summaries") && (
            <NavLink href="/portal/meetings">Meeting Summaries</NavLink>
          )}
          {enabledFeatureKeys.includes("tool_stack") && (
            <NavLink href="/portal/tools">Tool Stack</NavLink>
          )}
          {enabledFeatureKeys.includes("drive") && (
            <NavLink href="/portal/drive">Files</NavLink>
          )}
          {enabledFeatureKeys.includes("reporting") && (
            <NavLink href="/portal/reporting">Reporting</NavLink>
          )}
        </div>
        <div
          style={{
            marginTop: "auto",
            padding: "0 var(--gh-space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gh-space-2)",
          }}
        >
          <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
            {callerLabel}
          </p>
          <LogoutButton />
        </div>
      </nav>
      <main style={{ flex: 1, padding: "var(--gh-space-12)" }}>{children}</main>
    </div>
  );
}

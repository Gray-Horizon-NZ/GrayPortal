import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { DM_Sans, Cormorant, JetBrains_Mono } from "next/font/google";
import "./incrementum.css";
import IncrementumEntryOverlay from "@/components/incrementum/IncrementumEntryOverlay";
import IncrementumRail from "@/components/incrementum/IncrementumRail";
import { ThemeToggle, PrivacyToggle, Toast } from "@/components/incrementum/terminal/client";
import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { withCaller } from "@/lib/dal/auth";

// Project Incrementum (docs/Project-Incrementum-Plan.md) — a full-screen
// space of its own (Max, 2026-10-18): its own route group, not inside the
// GrayPortal shell. Since 22 Oct it wears the Terminal UI, ported exactly
// from the approved concept (OS/incrementum-terminal-concept, App.jsx):
// light by default, a dark toggle and a privacy blur in the header, the
// identity card + block buttons + folders in the rail, and one page
// scroller (the window scrolls; header and rail are sticky).
//
// The shell itself awaits only cookies, so the layout and the entry
// animation render the instant you click in; the live bits (phase, ads
// date, counts, mode) stream in through Suspense. Access: proxy.ts sends
// signed-out visitors to /login, contractors to /work and clients to
// /portal; every page's data is admin-only at the DAL (withIncrementum) and
// RLS (db/sql/030), so anyone else reaching a page gets error.tsx, never data.

// The concept's typefaces: DM Sans (all weights, UI and numbers), Cormorant
// (hero figures, monograms) and JetBrains Mono (codes). Scoped to this area
// through CSS variables on the wrapper.
const sans = DM_Sans({ subsets: ["latin"], variable: "--inc-f-body", display: "swap" });
const display = Cormorant({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--inc-f-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--inc-f-mono", display: "swap" });

// Both helpers swallow their own errors: they sit outside this segment's
// error.tsx (which only wraps the page), so a throw here would otherwise
// take down the whole page. The page underneath reports the real error.
async function safeSnapshot() {
  try {
    return await getIncrementumSnapshot();
  } catch {
    return null;
  }
}

async function Rail() {
  return <IncrementumRail s={await safeSnapshot()} />;
}

async function WhoAmI() {
  const [s, name] = await Promise.all([
    safeSnapshot(),
    withCaller(async (c) => c.displayName ?? c.email).catch(() => null),
  ]);
  return (
    <div className="whoami">
      <div className="label">
        Logged in as: <b>{name?.split(" ")[0] ?? "Admin"}</b>
        <br />
        {s ? (s.mode === "pre" ? "Pre-launch" : "Live") : ""}
      </div>
    </div>
  );
}

export default async function IncrementumLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = jar.get("inc_theme")?.value === "dark" ? "dark" : "light";
  const privacy = jar.get("inc_private")?.value === "on";
  return (
    <div className={`gh-incrementum ${sans.variable} ${display.variable} ${mono.variable}`} data-theme={theme} data-private={privacy ? "on" : "off"}>
      <IncrementumEntryOverlay />
      <div className="backdrop" />
      <div className="app inc-app">
        <header className="header">
          <Link className="wordmark" href="/incrementum">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="icon" src="/brand-icon.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="type" src="/email-wordmark.png" alt="Gray Horizon" />
          </Link>
          <div className="hdr-actions">
            <ThemeToggle initial={theme} />
            <PrivacyToggle initial={privacy} />
            <Suspense fallback={<div className="whoami" />}>
              <WhoAmI />
            </Suspense>
          </div>
        </header>
        <div className="body">
          <aside className="rail">
            <Suspense fallback={<IncrementumRail s={null} />}>
              <Rail />
            </Suspense>
          </aside>
          <main className="content">{children}</main>
        </div>
      </div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
    </div>
  );
}

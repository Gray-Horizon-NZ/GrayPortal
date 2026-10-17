"use client";
import { useEffect, useRef, useState } from "react";
import BootOverlayView from "./BootOverlayView";

const BOOT_KEY = "gh_booted";
const WELCOME_NAME_KEY = "gh_welcome_name";
// Safety net only — if DashboardReadySignal never mounts (a genuine error
// somewhere in the tree), the overlay still resolves instead of trapping
// the user behind a permanent screen.
const MAX_HOLD_MS = 6000;

declare global {
  interface Window {
    __ghAppReady?: boolean;
  }
}

/**
 * Persistent boot overlay — mounted once in each real shell layout
 * ((app)/layout.tsx, (portal)/portal/layout.tsx), not per-page, so it
 * survives the client-side navigation from /login into the dashboard
 * instead of racing it. Plays at most once per browser tab (sessionStorage
 * gate), on whichever of these actually happens first: completeSignIn
 * (src/app/login/completeSignIn.ts) just signed someone in, any provider
 * (name known, stashed in sessionStorage before the push), or the tab is
 * simply opening the app fresh with an existing session cookie (no name
 * known — generic copy).
 *
 * Unlike the old WelcomeTransition, this does not fade out on a fixed
 * timer — it waits for DashboardReadySignal (mounted inside the real
 * dashboard/portal home page) to confirm the destination's own data has
 * actually resolved, so the overlay never hands off to a still-loading
 * page. A minimum hold keeps it from flashing on a fast connection; a
 * maximum hold is a safety net, not the normal path.
 */
export default function SessionBootOverlay() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(BOOT_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode, etc.) — skip the once-
      // per-session gate rather than throwing; worst case it replays.
    }
    if (alreadyBooted) return;

    // Kicking off the reveal (and every timer/listener below) from inside a
    // deferred callback rather than as a bare statement at the top of the
    // effect — same discipline the previous WelcomeTransition used (its own
    // setState calls only ever happened inside setTimeout callbacks) — lets
    // the initial null render actually commit/paint first instead of a
    // setState forcing an immediate second render in the same pass.
    const kickoff = setTimeout(() => {
      let pendingName: string | null = null;
      try {
        pendingName = sessionStorage.getItem(WELCOME_NAME_KEY);
        if (pendingName) sessionStorage.removeItem(WELCOME_NAME_KEY);
      } catch {
        // ignore
      }

      setName(pendingName);
      setVisible(true);

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const minHoldMs = reduceMotion ? 80 : 1850;
      const leaveMs = reduceMotion ? 0 : 400;

      let minHoldDone = false;
      // Checked synchronously in case DashboardReadySignal already mounted
      // and set the flag before this ran — avoids a race against the
      // "gh-app-ready" event firing before the listener below is attached.
      let ready = window.__ghAppReady === true;
      let finished = false;

      function onReady() {
        ready = true;
        tryFinish();
      }

      function tryFinish() {
        if (finished || !minHoldDone || !ready) return;
        finished = true;
        window.removeEventListener("gh-app-ready", onReady);
        setLeaving(true);
        setTimeout(() => {
          try {
            sessionStorage.setItem(BOOT_KEY, "1");
          } catch {
            // ignore
          }
          setVisible(false);
        }, leaveMs);
      }

      window.addEventListener("gh-app-ready", onReady);
      const minHoldTimer = setTimeout(() => {
        minHoldDone = true;
        tryFinish();
      }, minHoldMs);
      const maxHoldTimer = setTimeout(() => {
        ready = true;
        tryFinish();
      }, MAX_HOLD_MS);

      cleanupRef.current = () => {
        clearTimeout(minHoldTimer);
        clearTimeout(maxHoldTimer);
        window.removeEventListener("gh-app-ready", onReady);
      };
    }, 0);

    return () => {
      clearTimeout(kickoff);
      cleanupRef.current?.();
    };
  }, []);

  if (!visible) return null;

  return (
    <BootOverlayView
      eyebrow="Gray Horizon"
      leaving={leaving}
      title={
        name ? (
          <>
            Welcome, <em>{name}</em>
          </>
        ) : (
          <>
            Welcome <em>back</em>
          </>
        )
      }
    />
  );
}

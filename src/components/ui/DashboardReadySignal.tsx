"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    __ghAppReady?: boolean;
  }
}

/**
 * Renders null — its only job is to exist inside a real dashboard entry
 * page's JSX (admin HomePage, portal PortalHomePage). Because those are
 * async Server Components, this component only mounts client-side once
 * that page's own data has actually resolved and its RSC payload has
 * reached the browser — mounting is itself the readiness signal.
 * SessionBootOverlay listens for the event to know when to stop covering
 * the page; the flag is set first (and checked directly by the overlay on
 * its own mount) so a listener that attaches a tick late still sees the
 * right answer instead of missing the one-shot event.
 */
export default function DashboardReadySignal() {
  useEffect(() => {
    window.__ghAppReady = true;
    window.dispatchEvent(new Event("gh-app-ready"));
  }, []);
  return null;
}

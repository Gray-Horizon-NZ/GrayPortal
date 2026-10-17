"use client";
import { useEffect } from "react";

/**
 * Renders null. Mounted at the bottom of every Incrementum page: mounting
 * only happens once that page's server data has resolved and reached the
 * browser, which is the signal IncrementumEntryOverlay waits for. Also
 * satisfies the session boot overlay (SessionBootOverlay) when a tab opens
 * straight onto /incrementum, which otherwise only hears from the
 * dashboard's own DashboardReadySignal.
 */
export default function IncrementumReadySignal() {
  useEffect(() => {
    window.__ghIncrementumReady = true;
    window.dispatchEvent(new Event("gh-incrementum-ready"));
    window.__ghAppReady = true;
    window.dispatchEvent(new Event("gh-app-ready"));
  }, []);
  return null;
}

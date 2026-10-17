"use client";
import { useEffect, useState } from "react";
import BootOverlayView from "@/components/ui/BootOverlayView";

declare global {
  interface Window {
    __ghIncrementumReady?: boolean;
  }
}

const MAX_HOLD_MS = 6000;

/**
 * "Entering Project Incrementum" (docs/Project-Incrementum-Plan.md §2.4) —
 * the session boot animation in the light palette. Mounted in the
 * Incrementum layout, so it plays on every *entry* into /incrementum
 * (sidebar, Home banner, direct URL, refresh) but not when moving between
 * Incrementum's own tabs, since a layout persists across its sub-pages.
 *
 * Readiness uses its own flag/event, never the dashboard's __ghAppReady
 * (already true by the time Max is on Home). The flag is cleared when the
 * layout unmounts (leaving Incrementum), not on mount: a page's
 * IncrementumReadySignal effect runs before this parent's effect in the
 * same commit, so clearing on mount would erase a ready signal that already
 * arrived.
 */
export default function IncrementumEntryOverlay() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minHoldMs = reduceMotion ? 80 : 1850;
    const leaveMs = reduceMotion ? 0 : 400;
    let minHoldDone = false;
    let ready = window.__ghIncrementumReady === true;
    let finished = false;
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;

    function tryFinish() {
      if (finished || !minHoldDone || !ready) return;
      finished = true;
      setLeaving(true);
      leaveTimer = setTimeout(() => setVisible(false), leaveMs);
    }
    function onReady() {
      ready = true;
      tryFinish();
    }

    window.addEventListener("gh-incrementum-ready", onReady);
    const minHold = setTimeout(() => {
      minHoldDone = true;
      tryFinish();
    }, minHoldMs);
    const maxHold = setTimeout(() => {
      ready = true;
      tryFinish();
    }, MAX_HOLD_MS);

    return () => {
      clearTimeout(minHold);
      clearTimeout(maxHold);
      if (leaveTimer) clearTimeout(leaveTimer);
      window.removeEventListener("gh-incrementum-ready", onReady);
      window.__ghIncrementumReady = false;
    };
  }, []);

  if (!visible) return null;
  return (
    <BootOverlayView
      tone="light"
      fadeIn
      leaving={leaving}
      eyebrow="Gray Horizon"
      title={
        <>
          Entering <em>Project Incrementum</em>
        </>
      }
    />
  );
}

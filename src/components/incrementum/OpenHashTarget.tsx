"use client";
import { useEffect } from "react";

/**
 * Opens the collapsed row a URL hash points at (#svc-…, #pkg-…), so a save
 * that bounces back with ?ok=…#pkg-x lands with that row expanded rather
 * than folded shut. `trigger` changes on every bounce (the page passes its
 * ok/error flash), re-running the effect after each client navigation —
 * router navigations don't fire `hashchange`.
 */
export default function OpenHashTarget({ trigger }: { trigger: string }) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
  }, [trigger]);
  return null;
}

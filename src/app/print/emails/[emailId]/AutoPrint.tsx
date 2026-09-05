"use client";

import { useEffect } from "react";

/** Fires the browser's print dialog once this page has painted — the
 * "Download as PDF" button just opens this route and lets the user pick
 * "Save as PDF" as the print destination, rather than the app carrying its
 * own PDF-rendering dependency. If a browser blocks auto-triggered print()
 * (some do), the page is still fully usable via the normal Ctrl/Cmd+P. */
export default function AutoPrint() {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 200);
    return () => clearTimeout(id);
  }, []);
  return null;
}

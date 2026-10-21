"use client";

/** "Save PDF" on the Apexus-Incrementum proposal: the browser's print-to-PDF, as on Apexus. */
export default function PrintButton() {
  return (
    <button type="button" className="print-btn" onClick={() => window.print()}>
      Save PDF
    </button>
  );
}

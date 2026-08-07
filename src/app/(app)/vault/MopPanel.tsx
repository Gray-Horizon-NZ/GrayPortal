"use client";
import { useState } from "react";
import { establishVaultSession } from "@/lib/vaultReauth";
import { generateMopAction, downloadMopAction, uploadMopAction } from "./actions";

type Status = { storagePath: string; generatedAt: Date | string } | null;

export default function MopPanel({ status }: { status: Status }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      await establishVaultSession();
      await generateMopAction();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setError(null);
    setBusy(true);
    try {
      await establishVaultSession();
      const result = await downloadMopAction();
      if (result?.url) window.location.href = result.url;
      else setError("No MOP archive exists yet — generate or upload one first");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename later
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await establishVaultSession();
      await uploadMopAction(file);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      {status ? (
        <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
          Last updated {new Date(status.generatedAt).toLocaleString("en-NZ")}
        </p>
      ) : (
        <p style={{ color: "var(--gh-text-muted)" }}>No package on file yet.</p>
      )}
      <div style={{ display: "flex", gap: "var(--gh-space-2)", flexWrap: "wrap" }}>
        <button className="gh-btn-primary" type="button" onClick={handleGenerate} disabled={busy}>
          {busy ? "Working…" : "Regenerate from credentials"}
        </button>
        <button className="gh-btn-secondary" type="button" onClick={handleDownload} disabled={busy}>
          Download
        </button>
        <label className="gh-btn-secondary" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
          Upload ZIP
          <input type="file" accept=".zip" onChange={handleUpload} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>
      <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>
        Uploading replaces the current package — whichever of generate/upload ran most recently is what downloads.
      </p>
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}

"use client";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export default function McpTokenButton() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGetToken() {
    setError(null);
    setLoading(true);
    try {
      const idToken = await firebaseAuth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not signed in");

      const res = await fetch("/api/mcp/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        setError("Couldn't generate a token. Try signing out and back in.");
        return;
      }
      const data = await res.json();
      setToken(data.token);
    } catch {
      setError("Couldn't generate a token. Try signing out and back in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      {!token && (
        <button className="gh-btn-secondary" onClick={handleGetToken} disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? "Generating…" : "Get MCP access token"}
        </button>
      )}
      {token && (
        <>
          <textarea
            className="gh-input"
            readOnly
            rows={3}
            value={token}
            onFocus={(e) => e.currentTarget.select()}
            style={{ fontFamily: "var(--gh-font-mono)", fontSize: "var(--gh-text-xs)" }}
          />
          <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-xs)" }}>
            Treat this like a password — anyone with it can act as your admin account for up to 14
            days. Paste it into your MCP client&apos;s Authorization header and don&apos;t store it
            anywhere else. It won&apos;t be shown again; generate a new one if you need it later.
          </p>
        </>
      )}
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}

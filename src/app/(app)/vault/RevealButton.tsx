"use client";
import { useState } from "react";
import { establishVaultSession } from "@/lib/vaultReauth";
import { revealCredentialAction } from "./actions";

// The per-reveal half of Phase 6's vault re-auth requirement (brief §2):
// an active session alone never reveals a secret. Forces a fresh Google
// re-auth, which — because the account has a TOTP factor enrolled
// (Settings > Two-factor authentication) — Firebase escalates into an MFA
// challenge. Only once that's resolved does /api/auth/vault-session mint
// the short-lived cookie that revealCredential() checks for.
export default function RevealButton({ credentialId }: { credentialId: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    setError(null);
    setBusy(true);
    try {
      await establishVaultSession();
      const { secret: revealed } = await revealCredentialAction(credentialId);
      setSecret(revealed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reveal credential");
    } finally {
      setBusy(false);
    }
  }

  if (secret) {
    return (
      <div style={{ display: "flex", gap: "var(--gh-space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <code style={{ fontFamily: "var(--gh-font-mono)", fontSize: "var(--gh-text-sm)" }}>{secret}</code>
        <button className="gh-btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(secret)}>
          Copy
        </button>
        <button className="gh-btn-secondary" type="button" onClick={() => setSecret(null)}>
          Hide
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-2)" }}>
      <button className="gh-btn-secondary" type="button" onClick={handleReveal} disabled={busy}>
        {busy ? "Verifying…" : "Reveal"}
      </button>
      {error && <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error}</p>}
    </div>
  );
}

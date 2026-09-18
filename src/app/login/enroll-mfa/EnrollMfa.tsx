"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useTotpEnroll } from "@/lib/totp/useTotpEnroll";
import { completeSignIn } from "../completeSignIn";

/**
 * Mandatory — no skip option, unlike the optional Settings toggle
 * (TotpEnrollment.tsx) that shares this same useTotpEnroll mechanics.
 * Reached (via proxy.ts's mfaEnrolled gate) only by a caller who already has
 * a valid session cookie but hasn't enrolled a second factor yet. On
 * success, re-runs completeSignIn so claimOrVerifyAllowlist recomputes and
 * restamps mfaEnrolled: true — that's what actually lifts the gate.
 */
export default function EnrollMfa() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [code, setCode] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const { secret, busy, error, startEnrollment, confirmEnrollment } = useTotpEnroll();
  const startedRef = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (user && !startedRef.current) {
      startedRef.current = true;
      startEnrollment(user);
    }
  }, [user, startEnrollment]);

  async function handleConfirm() {
    if (!user) return;
    const ok = await confirmEnrollment(user, code);
    if (!ok) return;

    setFinishing(true);
    const refreshedUser = firebaseAuth.currentUser;
    if (!refreshedUser) {
      setFinishError("Session lost — please sign in again.");
      setFinishing(false);
      return;
    }
    const outcome = await completeSignIn(refreshedUser);
    if (!outcome.ok) {
      setFinishError(outcome.error);
      setFinishing(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
      <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
        For your security, Gray Portal requires an authenticator app before you can continue.
      </p>
      {!secret ? (
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          {busy ? "Setting up…" : "Preparing enrollment…"}
        </p>
      ) : (
        <>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
            Add this key to your authenticator app (Google Authenticator, 1Password, etc.), then enter the
            6-digit code it generates.
          </p>
          <code style={{ fontFamily: "var(--gh-font-mono)", wordBreak: "break-all" }}>{secret.secretKey}</code>
          <input
            className="gh-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            maxLength={6}
          />
          <button
            className="gh-btn-primary"
            type="button"
            onClick={handleConfirm}
            disabled={busy || finishing || code.length !== 6}
            style={{ width: "100%" }}
          >
            {finishing ? "Finishing…" : "Confirm & continue"}
          </button>
        </>
      )}
      {(error || finishError) && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)" }}>{error ?? finishError}</p>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, getMultiFactorResolver, type MultiFactorResolver, type MultiFactorError } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { completeSignIn } from "./completeSignIn";
import MfaChallenge from "./MfaChallenge";

// Secondary sign-in option, below the primary email + password form
// (PasswordSignInForm) — for clients who do have a Google account. Shares
// completeSignIn with every other sign-in path so behavior stays identical
// regardless of provider.
export default function GoogleSignInButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);

  function finish() {
    router.push("/");
    router.refresh();
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const outcome = await completeSignIn(result.user);
      if (!outcome.ok) {
        setError(outcome.error);
        setLoading(false);
        return;
      }
      finish();
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "auth/multi-factor-auth-required") {
        setMfaResolver(getMultiFactorResolver(firebaseAuth, err as MultiFactorError));
        setLoading(false);
        return;
      }
      setError("Sign-in failed. Try again.");
      setLoading(false);
    }
  }

  if (mfaResolver) {
    return (
      <MfaChallenge
        resolver={mfaResolver}
        onSuccess={finish}
        onError={(message) => setError(message)}
      />
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
      <button
        className="gh-btn-secondary"
        onClick={handleSignIn}
        disabled={loading}
        style={{ width: "100%", padding: "var(--gh-space-4)" }}
      >
        {loading ? "Signing in…" : "Sign in with Google"}
      </button>
      {error && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

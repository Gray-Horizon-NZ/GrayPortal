"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import WelcomeTransition from "@/components/ui/WelcomeTransition";

export default function LoginButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);

      // Step 1: claim the allowlist row and stamp role/clientId custom
      // claims server-side. The ID token we already hold predates this —
      // Firebase only propagates new custom claims into a token after it's
      // refreshed — so this step issues no cookie yet.
      const firstIdToken = await result.user.getIdToken();
      const claimRes = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: firstIdToken }),
      });

      if (!claimRes.ok) {
        setError(
          claimRes.status === 401
            ? "This Google account isn't authorised for Gray Portal."
            : "Sign-in hit a server error. Try again, or tell Max if it keeps happening."
        );
        setLoading(false);
        return;
      }

      // Step 2: force-refresh to pick up the claims just stamped, then
      // exchange that token for the actual session cookie.
      const refreshedIdToken = await result.user.getIdToken(true);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: refreshedIdToken }),
      });

      if (!res.ok) {
        setError(
          res.status === 401
            ? "This Google account isn't authorised for Gray Portal."
            : "Sign-in hit a server error. Try again, or tell Max if it keeps happening."
        );
        setLoading(false);
        return;
      }

      const firstName = (result.user.displayName ?? result.user.email ?? "back").split(" ")[0];
      setWelcomeName(firstName);
    } catch {
      setError("Sign-in failed. Try again.");
      setLoading(false);
    }
  }

  if (welcomeName) {
    return (
      <WelcomeTransition
        name={welcomeName}
        onDone={() => {
          router.push("/");
          router.refresh();
        }}
      />
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-4)" }}>
      <button
        className="gh-btn-primary"
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

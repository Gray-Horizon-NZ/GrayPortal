"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { completeSignIn } from "./completeSignIn";

/**
 * The session cookie is capped at Firebase's max (14 days,
 * SESSION_MAX_AGE_MS) — every user re-authenticates on that cadence. But the
 * Firebase client SDK persists the signed-in user in the browser
 * independently of our cookie (browserLocalPersistence, the default), so a
 * returning visit in the same browser can skip straight back in without a
 * new password entry or emailed link. Renders first on the login page;
 * falls through to the normal sign-in UI (children) if there's no persisted
 * session, or if resuming one fails (e.g. removed from the allowlist since).
 */
export default function SilentResume({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "resuming" | "none" | "failed">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setState("none");
        return;
      }
      setState("resuming");
      const outcome = await completeSignIn(user);
      if (!outcome.ok) {
        setError(outcome.error);
        setState("failed");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }, [router]);

  if (state === "checking" || state === "resuming") {
    return (
      <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", textAlign: "center" }}>
        {state === "resuming" ? "Welcome back — signing you in…" : ""}
      </p>
    );
  }

  return (
    <>
      {error && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", textAlign: "center", marginBottom: "var(--gh-space-4)" }}>
          {error}
        </p>
      )}
      {children}
    </>
  );
}

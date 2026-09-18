"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getMultiFactorResolver, type MultiFactorResolver, type MultiFactorError } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { completeSignIn } from "./completeSignIn";
import MfaChallenge from "./MfaChallenge";

const INVALID_CREDENTIAL_MESSAGE = "Incorrect email or password.";

export default function PasswordSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  function finish() {
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const outcome = await completeSignIn(result.user);
      if (!outcome.ok) {
        setError(outcome.error);
        setBusy(false);
        return;
      }
      finish();
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "auth/multi-factor-auth-required") {
          setMfaResolver(getMultiFactorResolver(firebaseAuth, err as MultiFactorError));
          setBusy(false);
          return;
        }
      }
      // Firebase's modern SDK already collapses wrong-password and
      // no-such-account into this one code — used as-is so the message
      // never reveals which case it was (enumeration-safe).
      setError(INVALID_CREDENTIAL_MESSAGE);
      setBusy(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    try {
      await fetch("/api/auth/password/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } finally {
      setForgotSent(true);
      setForgotBusy(false);
    }
  }

  if (mfaResolver) {
    return <MfaChallenge resolver={mfaResolver} onSuccess={finish} onError={setError} />;
  }

  if (forgotOpen) {
    return (
      <form onSubmit={handleForgotSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        {forgotSent ? (
          <p style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>
            If that email has portal access, a link to set your password is on its way.
          </p>
        ) : (
          <>
            <input
              className="gh-input"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Your email"
              required
            />
            <button className="gh-btn-primary" type="submit" disabled={forgotBusy} style={{ width: "100%" }}>
              {forgotBusy ? "Sending…" : "Send password link"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setForgotOpen(false);
            setForgotSent(false);
          }}
          style={{ background: "none", border: "none", color: "var(--gh-accent)", fontSize: "var(--gh-text-sm)", cursor: "pointer", padding: 0 }}
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
      <input
        className="gh-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        required
      />
      <input
        className="gh-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        required
      />
      <button className="gh-btn-primary" type="submit" disabled={busy} style={{ width: "100%", padding: "var(--gh-space-4)" }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => setForgotOpen(true)}
        style={{ background: "none", border: "none", color: "var(--gh-accent)", fontSize: "var(--gh-text-sm)", cursor: "pointer", padding: 0, alignSelf: "center" }}
      >
        Forgot your password?
      </button>
      {error && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", textAlign: "center" }}>{error}</p>
      )}
    </form>
  );
}

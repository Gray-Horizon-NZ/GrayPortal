"use client";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import WizardShell from "./WizardShell";
import { updateOnboardingDetailsAction, submitAccessRequestAction } from "@/app/onboard/[token]/actions";
import type { OnboardingWizardData } from "@/lib/dal/onboardingInvites";

type WizardData = Extract<OnboardingWizardData, { status: "valid" }>;

// 6 steps from Open-Work-Brief.md §4.3's original 7 (2026-08-28: the
// original step 7, "Enter Client Portal," was folded into step 6 per
// Max's request — GrayScale is now the wizard's last real step, and its
// own action triggers the portal-entry transition directly, no separate
// step after it). One is deliberately not wired to a real backend yet:
// - Step 4 (documents) is a static UI mock — the four expected document
//   names, not real attached files. §4.5's attach mechanism is still
//   deferred; this just shows Max what the tile set looks like.
const STEP_COUNT = 6;

// Matches §4.5's four expected documents — the UI mock for step 4 until the
// real attach mechanism (documents typed "other" + title, per the decided
// approach) is wired up.
const ONBOARDING_DOCUMENT_NAMES = ["Welcome Document", "Project Brief", "Delivery Guide", "Thank You Document"];

function NextButton({
  onClick,
  pending,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: "promo";
  children: ReactNode;
}) {
  return (
    <button
      className={variant === "promo" ? "gh-btn-primary gh-wizard-cta-promo" : "gh-btn-primary"}
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
    >
      {pending ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--gh-space-2)" }}>
          <Loader2 className="gh-spin" size={14} strokeWidth={2} />
          Working…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)" }}>
      <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{label}</span>
      <input className="gh-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function servicePriceLabel(s: WizardData["services"][number]): string {
  const price = s.customMonthlyPrice ?? s.currentMonthlyPrice ?? s.customSetupPrice ?? s.currentSetupPrice;
  if (price == null) return "";
  const discount = s.discountPercent != null && Number(s.discountPercent) > 0 ? ` — ${s.discountPercent}% off` : "";
  return `$${price}${discount}`;
}

export default function OnboardingWizard({
  mode,
  token,
  data,
}: {
  mode: "live" | "preview";
  token?: string;
  data: WizardData;
}) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  const [details, setDetails] = useState({
    businessName: data.company.businessName ?? data.clientName,
    mainEmail: data.company.mainEmail ?? "",
    phone: data.company.phone ?? "",
    mainContactPosition: data.company.mainContactPosition ?? "",
    address: data.company.address ?? "",
    postalAddress: data.company.postalAddress ?? "",
    referredBy: data.company.referredBy ?? "",
  });
  const [accessEmail, setAccessEmail] = useState("");
  const [accessDisplayName, setAccessDisplayName] = useState("");
  const [accessRequested, setAccessRequested] = useState(false);

  function goNext() {
    setError(null);
    setStep((s) => Math.min(STEP_COUNT, s + 1));
  }

  function handleDetailsNext() {
    if (mode === "preview") {
      goNext();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateOnboardingDetailsAction(token!, details);
        goNext();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save your details");
      }
    });
  }

  function handleRequestAccess() {
    if (mode === "preview" || !accessEmail) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitAccessRequestAction(token!, { email: accessEmail, displayName: accessDisplayName || undefined });
        setAccessRequested(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't submit that request");
      }
    });
  }

  function handleEnterPortal() {
    setEntering(true);
    setTimeout(() => {
      window.location.href = "/login";
    }, 2600);
  }

  // Always rendered in WizardShell's fixed bottom-right slot — same spot
  // on every step regardless of content length (2026-08-27 feedback).
  function renderAction(): ReactNode {
    switch (step) {
      case 1:
        return <NextButton onClick={goNext}>Get started</NextButton>;
      case 2:
        return (
          <NextButton onClick={handleDetailsNext} pending={pending}>
            Next
          </NextButton>
        );
      case 6:
        if (entering) return null;
        return mode === "live" ? (
          <NextButton onClick={handleEnterPortal} variant="promo">
            Enter Client Portal
          </NextButton>
        ) : (
          <Link href={`/clients/${data.clientId}`} className="gh-btn-secondary">
            Back to client profile
          </Link>
        );
      default:
        return <NextButton onClick={goNext}>Next</NextButton>;
    }
  }

  return (
    <WizardShell
      clientName={data.clientName}
      stepIndex={step}
      stepCount={STEP_COUNT}
      action={renderAction()}
      promo={step === 6 && !entering}
    >
      {mode === "preview" && step !== STEP_COUNT && (
        <p className="gh-eyebrow" style={{ color: "var(--gh-accent)", marginBottom: "var(--gh-space-4)" }}>
          Preview — nothing here is saved
        </p>
      )}
      {error && (
        <p style={{ color: "var(--gh-danger)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-4)" }}>{error}</p>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
          <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
            Let&apos;s get your portal set up.
          </h1>
          <p style={{ color: "var(--gh-text-muted)" }}>A few quick steps and you&apos;ll be in.</p>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <h2 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Confirm your details
          </h2>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-2)" }}>
            Here&apos;s what we have — tell us if anything&apos;s changed.
          </p>
          <LabeledInput label="Business name" value={details.businessName} onChange={(v) => setDetails((d) => ({ ...d, businessName: v }))} />
          <LabeledInput label="Main email" type="email" value={details.mainEmail} onChange={(v) => setDetails((d) => ({ ...d, mainEmail: v }))} />
          <LabeledInput label="Phone" value={details.phone} onChange={(v) => setDetails((d) => ({ ...d, phone: v }))} />
          <LabeledInput label="Position" value={details.mainContactPosition} onChange={(v) => setDetails((d) => ({ ...d, mainContactPosition: v }))} />
          <LabeledInput label="Address" value={details.address} onChange={(v) => setDetails((d) => ({ ...d, address: v }))} />
          <LabeledInput
            label="Postal address (if different)"
            value={details.postalAddress}
            onChange={(v) => setDetails((d) => ({ ...d, postalAddress: v }))}
          />
          <LabeledInput label="Referred by (if any)" value={details.referredBy} onChange={(v) => setDetails((d) => ({ ...d, referredBy: v }))} />
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <h2 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Request portal access
          </h2>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-2)" }}>
            You&apos;ll access your portal with the email we invited. Need it under a different Google account, or want
            to add a second person?
          </p>
          {accessRequested ? (
            <p style={{ color: "var(--gh-success)", fontSize: "var(--gh-text-sm)" }}>
              Request sent — we&apos;ll approve it shortly.
            </p>
          ) : (
            <>
              <LabeledInput label="Google account email" type="email" value={accessEmail} onChange={setAccessEmail} />
              <LabeledInput label="Name (optional)" value={accessDisplayName} onChange={setAccessDisplayName} />
              <button
                className="gh-btn-secondary"
                type="button"
                onClick={handleRequestAccess}
                disabled={pending || !accessEmail}
                style={{ alignSelf: "flex-start" }}
              >
                {mode === "preview" ? "Request access (preview — disabled)" : "Request access"}
              </button>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <h2 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Your documents
          </h2>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-6)" }}>
            A preview of the set — these stay available afterward under your portal&apos;s own Documents section.
          </p>
          <div className="gh-wizard-doc-grid">
            {ONBOARDING_DOCUMENT_NAMES.map((name) => (
              <div key={name} className="gh-wizard-doc-tile">
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <h2 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
            Your services
          </h2>
          <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)", marginBottom: "var(--gh-space-2)" }}>
            What&apos;s currently agreed.
          </p>
          {data.services.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>Nothing active yet.</p>}
          {data.services.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--gh-text-sm)" }}>
              <span>{s.deliverable}</span>
              <span style={{ color: "var(--gh-text-muted)" }}>{servicePriceLabel(s)}</span>
            </div>
          ))}
        </div>
      )}

      {step === 6 &&
        (entering ? (
          <div className="gh-glow-panel gh-animate-fade-in" style={{ textAlign: "center" }}>
            <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>
              Gray Horizon
            </p>
            <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
              Setting up your portal…
            </h1>
          </div>
        ) : (
          // Not position: relative here — .gh-wizard-grayscale-beam/-vignette
          // below are absolutely positioned against .gh-wizard-right--promo
          // (the whole panel), not this 480px content column, so the effect
          // spans the full right side the way the mockup intended.
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-4)", textAlign: "center" }}>
            <div className="gh-wizard-grayscale-beam" />
            <div className="gh-wizard-grayscale-vignette" />
            <p className="gh-eyebrow">Software Division</p>
            {/* "Introducing" explicitly white — the designer's mockup this
                is based on never set a base text color on the headline, so
                it inherited nothing and would've rendered invisible; only
                "Gray Scale" had an explicit color (gold). */}
            <h2 className="gh-title" style={{ fontSize: "2.75rem", lineHeight: 1.05 }}>
              <span style={{ color: "var(--gh-text-emphasis)" }}>Introducing</span>{" "}
              <em style={{ color: "var(--gh-accent)" }}>Gray Scale</em>
            </h2>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
              AI and software systems, already live for clients like you.
            </p>
            <p style={{ color: "var(--gh-accent)", fontSize: "var(--gh-text-xs)", marginTop: "var(--gh-space-8)" }}>
              As a Gray Horizon client, you get member pricing on every GrayScale product — automatically, no extra
              step.
            </p>
            <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-xs)" }}>
              {mode === "live" ? "Ready when you are." : "This is where a real client steps straight into their live portal."}
            </p>
          </div>
        ))}
    </WizardShell>
  );
}

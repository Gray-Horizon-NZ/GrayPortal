"use client";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import WizardShell from "./WizardShell";
import { updateOnboardingDetailsAction, submitAccessRequestAction } from "@/app/onboard/[token]/actions";
import type { OnboardingWizardData } from "@/lib/dal/onboardingInvites";

type WizardData = Extract<OnboardingWizardData, { status: "valid" }>;

// Only 5 of the 7 steps in Open-Work-Brief.md §4.3 exist yet — documents
// (step 4) and the GrayScale discount close (step 6) are both deliberately
// deferred (documents: build later; GrayScale: still an unscoped greenfield
// product family). The indicator counts what's actually here, not the
// eventual 7, so it doesn't imply steps that don't exist yet.
const STEP_COUNT = 5;

function NextButton({
  onClick,
  pending,
  disabled,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button className="gh-btn-primary" type="button" onClick={onClick} disabled={disabled || pending} style={{ alignSelf: "flex-start" }}>
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

  return (
    <WizardShell clientName={data.clientName} stepIndex={step} stepCount={STEP_COUNT}>
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
          <NextButton onClick={goNext}>Get started</NextButton>
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
          <div style={{ marginTop: "var(--gh-space-3)" }}>
            <NextButton onClick={handleDetailsNext} pending={pending}>
              Next
            </NextButton>
          </div>
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
          <div style={{ marginTop: "var(--gh-space-3)" }}>
            <NextButton onClick={goNext}>Next</NextButton>
          </div>
        </div>
      )}

      {step === 4 && (
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
          <div style={{ marginTop: "var(--gh-space-3)" }}>
            <NextButton onClick={goNext}>Next</NextButton>
          </div>
        </div>
      )}

      {step === 5 && <EnterPortalStep mode={mode} clientId={data.clientId} />}
    </WizardShell>
  );
}

function EnterPortalStep({ mode, clientId }: { mode: "live" | "preview"; clientId: string }) {
  const [entering, setEntering] = useState(false);

  if (entering) {
    return (
      <div className="gh-glow-panel gh-animate-fade-in" style={{ textAlign: "center" }}>
        <p className="gh-eyebrow" style={{ marginBottom: "var(--gh-space-3)" }}>
          Gray Horizon
        </p>
        <h1 className="gh-title" style={{ fontSize: "var(--gh-text-xl)" }}>
          Setting up your portal…
        </h1>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)" }}>
      <h1 className="gh-title" style={{ fontSize: "var(--gh-text-2xl)" }}>
        You&apos;re all set.
      </h1>
      <p style={{ color: "var(--gh-text-muted)" }}>
        {mode === "live"
          ? "Everything's ready — step into your portal."
          : "This is where a real client lands in their live portal."}
      </p>
      {mode === "live" ? (
        <button
          className="gh-btn-primary"
          type="button"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            setEntering(true);
            setTimeout(() => {
              window.location.href = "/login";
            }, 2600);
          }}
        >
          Enter Client Portal
        </button>
      ) : (
        <Link href={`/clients/${clientId}`} className="gh-btn-secondary" style={{ alignSelf: "flex-start" }}>
          Back to client profile
        </Link>
      )}
    </div>
  );
}

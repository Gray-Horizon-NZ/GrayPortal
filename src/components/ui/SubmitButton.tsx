"use client";
import { useFormStatus } from "react-dom";

/**
 * Drop-in replacement for a plain <button type="submit"> inside a
 * <form action={...}>. No prior form in this codebase gave any feedback
 * between click and the page re-rendering with fresh data — this fills
 * that gap without a separate "confirmation" state, since the existing
 * revalidatePath calls already refresh the UI the instant the action
 * resolves, which is the confirmation.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "gh-btn-primary",
  style,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={disabled || pending} style={style}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

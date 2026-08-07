import { CircleHelp } from "lucide-react";

/**
 * Native <details> disclosure styled as a small popover — same
 * no-client-JS convention this app already uses for edit/add forms, not a
 * hover-triggered tooltip (works identically on touch devices for free).
 */
export default function HelpTooltip({ text }: { text: string }) {
  return (
    <details className="gh-help-tooltip">
      <summary aria-label="What is this?">
        <CircleHelp size={14} strokeWidth={1.75} />
      </summary>
      <p>{text}</p>
    </details>
  );
}

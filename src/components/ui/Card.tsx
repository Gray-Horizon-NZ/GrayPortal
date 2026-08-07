export default function Card({
  eyebrow,
  title,
  action,
  interactive,
  density,
  className,
  style,
  children,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  interactive?: boolean;
  /** "compact" for data-dense contexts (lists, homepage panels) — drops
   * padding one step. Default stays the spacious --gh-space-6 (login card,
   * empty states, anywhere the card is the whole point of the screen). */
  density?: "compact" | "comfortable";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`gh-card${interactive ? " gh-card--interactive" : ""}${className ? ` ${className}` : ""}`}
      style={density === "compact" ? { padding: "var(--gh-space-4)", ...style } : style}
    >
      {(eyebrow || title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--gh-space-4)",
            marginBottom: "var(--gh-space-4)",
          }}
        >
          <div>
            {eyebrow && <p className="gh-eyebrow">{eyebrow}</p>}
            {title && (
              <p className="gh-title" style={{ fontSize: "var(--gh-text-lg)" }}>
                {title}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

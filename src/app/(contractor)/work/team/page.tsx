import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { shortDate } from "@/lib/incrementum/format";
import { Head } from "@/components/contractor/ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default async function Team() {
  const w = await getMyWorkspace();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 1100 }}>
      <Head
        eyebrow="◆ Official"
        title={
          <>
            Gray Horizon <em>Team</em>
          </>
        }
        lede="The specialists who deliver Gray Horizon's client work."
      />
      <div className="gh-grid-joined gh-grid-joined--3">
        {w.team.map((m) => (
          <div key={m.contractor_id} className="gh-grid-cell" style={{ gap: "var(--gh-space-3)", flexDirection: "row", alignItems: "flex-start" }}>
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--gh-radius-full)",
                border: "1px solid var(--gh-accent)",
                color: "var(--gh-accent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--gh-font-display)",
                fontWeight: 600,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.photo_url ? <img src={m.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(m.name)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <strong style={{ fontWeight: 500 }}>
                {m.name}
                {m.contractor_id === w.me?.contractor_id ? <span style={{ color: "var(--gh-text-muted)" }}> (you)</span> : null}
              </strong>
              <span style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>{m.public_title ?? "Specialist"}</span>
              {m.services?.length ? <span style={{ fontSize: "var(--gh-text-xs)" }}>{m.services.join(" · ")}</span> : null}
              {m.bio && <span style={{ fontSize: "var(--gh-text-sm)", color: "var(--gh-text-muted)" }}>{m.bio}</span>}
              <span style={{ fontSize: "var(--gh-text-micro)", color: "var(--gh-text-muted)" }}>On the team since {shortDate(m.team_since, true)}</span>
            </div>
          </div>
        ))}
        {w.team.length === 0 && <p style={{ color: "var(--gh-text-muted)", padding: "var(--gh-space-4)" }}>No one listed yet.</p>}
      </div>
    </div>
  );
}

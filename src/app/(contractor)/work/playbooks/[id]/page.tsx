import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyWorkspace } from "@/lib/dal/contractorPortal";
import { renderTrustedMarkdown } from "@/lib/markdown";
import { shortDate } from "@/lib/incrementum/format";
import { Head } from "@/components/contractor/ui";

export default async function MyPlaybook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getMyWorkspace();
  const p = w.playbooks.find((x) => x.id === id);
  if (!p) notFound();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-6)", maxWidth: 800 }}>
      <Link href="/work/playbooks" style={{ fontSize: "var(--gh-text-sm)" }}>
        ← Playbooks
      </Link>
      <Head eyebrow={`${p.service_name ?? "General"} · v${p.version} · ${shortDate(p.updated_at, true)}`} title={p.title} />
      <div className="gh-card gh-prose" dangerouslySetInnerHTML={{ __html: renderTrustedMarkdown(p.body) }} />
    </div>
  );
}

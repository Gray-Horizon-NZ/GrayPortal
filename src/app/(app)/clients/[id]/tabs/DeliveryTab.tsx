import SubmitButton from "@/components/ui/SubmitButton";
import {
  uploadDocumentAction,
  renameDocumentAction,
  deleteDocumentAction,
  updateClientEmbedsAction,
  createToolStackItemAction,
  deleteToolStackItemAction,
  createRoadmapItemAction,
  deleteRoadmapItemAction,
  createIdeationItemAction,
  deleteIdeationItemAction,
} from "../../actions";
import type { ClientRecord, ClientDocument, RoadmapItem, IdeationItem, ToolStackItem } from "./types";

export default function DeliveryTab({
  client,
  documents,
  roadmap,
  ideas,
  tools,
}: {
  client: ClientRecord;
  documents: ClientDocument[];
  roadmap: RoadmapItem[];
  ideas: IdeationItem[];
  tools: ToolStackItem[];
}) {
  return (
    <div className="gh-tab-grid">
      <div className="gh-tab-grid-col">
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Documents</p>
        {documents.map((d) => (
          <div key={d.id} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-1)", borderBottom: "1px solid var(--gh-border)", paddingBottom: "var(--gh-space-2)" }}>
            <div className="gh-item-row" style={{ border: "none", padding: 0 }}>
              <span>{d.title ?? d.docType}</span>
              <div className="gh-item-row-actions">
                {d.externalUrl ? (
                  <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="gh-link-btn">Open link ↗</a>
                ) : (
                  <a href={`/api/documents/${d.id}/download`} className="gh-link-btn">Download</a>
                )}
                <form action={deleteDocumentAction.bind(null, d.id, client.id)}>
                  <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
                </form>
              </div>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)" }}>Rename</summary>
              <form
                action={renameDocumentAction.bind(null, d.id, client.id)}
                style={{ display: "flex", gap: "var(--gh-space-2)", marginTop: "var(--gh-space-2)" }}
              >
                <input className="gh-input" name="title" defaultValue={d.title ?? ""} required style={{ flex: 1 }} />
                <SubmitButton style={{ fontSize: "var(--gh-text-micro)" }}>Save</SubmitButton>
              </form>
            </details>
          </div>
        ))}
        {documents.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No documents yet.</p>}
        <div className="gh-add-form">
          <form
            action={uploadDocumentAction.bind(null, client.id)}
            encType="multipart/form-data"
            style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}
          >
            <input type="hidden" name="companyId" value={client.companyId ?? ""} />
            <input className="gh-input" name="title" placeholder="Document name" required />
            <select className="gh-input" name="docType" defaultValue="other">
              <option value="proposal">Proposal</option>
              <option value="contract">Contract</option>
              <option value="deck">Deck</option>
              <option value="other">Other</option>
            </select>
            <input className="gh-input" name="file" type="file" />
            <p style={{ fontSize: "var(--gh-text-xs)", color: "var(--gh-text-muted)", textAlign: "center" }}>— or —</p>
            <input className="gh-input" name="externalUrl" type="url" placeholder="Link a Drive/hosted PDF URL instead" />
            <SubmitButton>Add document</SubmitButton>
          </form>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Drive &amp; Reporting embeds</p>
        <p style={{ color: "var(--gh-text-muted)", fontSize: "var(--gh-text-sm)" }}>
          Drive and Looker Studio stay the systems of record — these are just the URLs the portal embeds,
          not files GrayPortal stores itself.
        </p>
        <form action={updateClientEmbedsAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input className="gh-input" name="driveFolderUrl" defaultValue={client.driveFolderUrl ?? ""} placeholder="Drive folder embed URL" />
          <input className="gh-input" name="lookerStudioUrl" defaultValue={client.lookerStudioUrl ?? ""} placeholder="Looker Studio embed URL" />
          <SubmitButton style={{ alignSelf: "flex-start" }}>Save</SubmitButton>
        </form>
      </section>
      </div>

      <div className="gh-tab-grid-col">
      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Tool Stack</p>
        {tools.map((t) => (
          <div key={t.id} className="gh-item-row">
            <span>{t.toolName} {t.category && <span style={{ color: "var(--gh-text-muted)" }}>({t.category})</span>} <span className="gh-badge">{t.status}</span></span>
            <form action={deleteToolStackItemAction.bind(null, t.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {tools.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No tools logged yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add tool</summary>
            <form action={createToolStackItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="toolName" placeholder="Tool name" required />
              <input className="gh-input" name="category" placeholder="Category (optional)" />
              <select className="gh-input" name="status" defaultValue="current">
                <option value="current">Current</option>
                <option value="planned">Planned</option>
              </select>
              <SubmitButton>Add tool</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Roadmap</p>
        {roadmap.map((it) => (
          <div key={it.id} className="gh-item-row">
            <span>{it.title} <span className="gh-badge">{it.status}</span> {it.targetDate && <span style={{ color: "var(--gh-text-muted)" }}>({it.targetDate})</span>}</span>
            <form action={deleteRoadmapItemAction.bind(null, it.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {roadmap.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No roadmap items yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add roadmap item</summary>
            <form action={createRoadmapItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="title" placeholder="Title" required />
              <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
              <input className="gh-input" name="targetDate" type="date" />
              <SubmitButton>Add item</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <section className="gh-card" style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
        <p className="gh-eyebrow">Ideation</p>
        {ideas.map((it) => (
          <div key={it.id} className="gh-item-row">
            <span>{it.title} <span className="gh-badge">{it.status}</span></span>
            <form action={deleteIdeationItemAction.bind(null, it.id, client.id)}>
              <SubmitButton className="gh-link-btn gh-link-btn--danger">Remove</SubmitButton>
            </form>
          </div>
        ))}
        {ideas.length === 0 && <p style={{ color: "var(--gh-text-muted)" }}>No ideas logged yet.</p>}
        <div className="gh-add-form">
          <details>
            <summary className="gh-eyebrow" style={{ cursor: "pointer" }}>+ Add idea</summary>
            <form action={createIdeationItemAction.bind(null, client.id)} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)", marginTop: "var(--gh-space-4)" }}>
              <input className="gh-input" name="title" placeholder="Idea title" required />
              <textarea className="gh-input" name="description" placeholder="Description" rows={2} />
              <SubmitButton>Add idea</SubmitButton>
            </form>
          </details>
        </div>
      </section>
      </div>
    </div>
  );
}

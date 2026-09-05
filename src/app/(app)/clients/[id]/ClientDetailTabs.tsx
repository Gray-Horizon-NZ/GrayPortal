"use client";

import { useState, type ReactNode } from "react";

/**
 * Panes stay mounted at all times and are switched with a data-attribute
 * (display:none/block in CSS) rather than conditional rendering — so an
 * in-progress edit in one tab's form isn't lost by unmounting it when the
 * user switches away and back. `initialTabId` is computed server-side from
 * searchParams so a redirect from a server action (e.g. after sending a
 * portal invite) lands back on the tab that shows its confirmation message.
 */
export default function ClientDetailTabs({
  tabs,
  initialTabId,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  initialTabId?: string;
}) {
  const [activeTab, setActiveTab] = useState(initialTabId ?? tabs[0]?.id);

  return (
    <div>
      <div className="gh-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="gh-tab-btn"
            data-active={activeTab === tab.id}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "var(--gh-space-6)" }}>
        {tabs.map((tab) => (
          <div key={tab.id} className="gh-tab-pane" data-active={activeTab === tab.id} role="tabpanel">
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

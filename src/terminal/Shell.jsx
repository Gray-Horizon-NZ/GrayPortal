"use client";
// The terminal concept's shell (OS/GrayPortal/terminal-concepts/grayportal-terminal-concept/src/App.jsx):
// header with search, website inquiries, theme and privacy toggles, alerts
// and "logged in as"; the rail of block buttons with folders below. Same
// markup and classes. Differences: routes come from Next (usePathname), the
// rail buttons are prefetching <Link>s, and the data is real.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home as HomeIcon, TrendingUp, BarChart3, Workflow, Users, ListChecks, CalendarDays, Wallet,
  Search, Sun, Moon, Eye, EyeOff, Bell, FolderOpen, FolderClosed, ChevronDown, Inbox, Mail, Phone, Globe, MessageSquare,
} from "lucide-react";
import { PrefsProvider, StoreData, useStore } from "./store";
import { INQUIRIES_SEEN_KEY } from "./persist";
import { fmtDate } from "./format";
import { go, setNavigator, Dropdown, Modal, KV, Priv } from "./ui";

// Big block buttons for the pages used daily; everything else sits in
// folder-style sub-menus underneath, like the original terminal rail.
const PRIMARY = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/incrementum", label: "Project Incrementum", icon: TrendingUp, accent: true },
  { href: "/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/clients", label: "Clients", icon: Users, count: "clients" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, count: "tasks" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];
const FOLDERS = [
  { label: "Comms", items: [["Email Triage", "/email-triage", "unread"], ["Email Templates", "/email-templates"], ["Email Campaigns", "/email-campaigns"]] },
  { label: "Finance tools", items: [["Owner's Cut", "/finance/personal"], ["Expenses", "/finance/expenses"], ["Pricing", "/pricing"], ["GrayScale", "/grayscale-products"], ["Apexus", "/apexus"]] },
  { label: "Work", items: [["Ideation", "/ideation"], ["AI Agents", "/ai-agents"], ["Reminders", "/reminders"]] },
  { label: "Systems", items: [["Vault", "/vault"], ["Brand Guidelines", "/brand-guidelines"], ["Settings", "/settings"]] },
];

function Inquiries() {
  const { inquiries, setInquiries } = useStore();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);

  // Which inquiries were already opened lives in this browser (as in the concept).
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(INQUIRIES_SEEN_KEY) || "[]");
      if (seen.length) setInquiries((xs) => xs.map((x) => (seen.includes(x.id) ? { ...x, seen: true } : x)));
    } catch {
      /* storage blocked */
    }
    // Runs once per fresh inquiries list from the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiries.length]);

  const unseen = inquiries.filter((i) => !i.seen).length;
  const lead = inquiries.find((i) => i.id === sel);
  const openLead = (id) => {
    setSel(id);
    setOpen(false);
    setInquiries((xs) => xs.map((x) => (x.id === id ? { ...x, seen: true } : x)));
  };
  return (
    <div className="hdr-drop">
      <button className="inq-btn" data-dropdown-trigger data-new={unseen > 0 || undefined} onClick={() => setOpen(!open)} aria-expanded={open}>
        <MessageSquare size={14} /> <span className="lbl">Inquiries</span> <span className="n">{unseen || inquiries.length}</span>
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)} width={380}>
        <div className="dropdown-head"><span className="ptitle">Website inquiries</span><span className="muted small" style={{ marginLeft: "auto" }}>{unseen} new</span></div>
        {inquiries.length === 0 && <div className="dropdown-item" style={{ gridTemplateColumns: "1fr" }}><span className="muted">No website inquiries yet.</span></div>}
        {inquiries.map((i) => (
          <button key={i.id} className="dropdown-item" onClick={() => openLead(i.id)}>
            <span className="sdot" data-s={i.seen ? undefined : "warn"} style={{ marginTop: 5, opacity: i.seen ? 0.25 : 1, background: i.seen ? undefined : "var(--t-accent)" }} />
            <span>
              <b className={i.seen ? "" : "strong"}>{i.companyName}</b> · <Priv>{i.firstName} {i.lastName}</Priv>
              <small>{i.message.slice(0, 70)}{i.message.length > 70 ? "…" : ""}</small>
            </span>
            <span className="muted small">{fmtDate(i.at)}</span>
          </button>
        ))}
      </Dropdown>
      <Modal open={!!lead} onClose={() => setSel(null)} title={lead ? `Inquiry · ${lead.companyName}` : ""}>
        {lead && (
          <>
            <p className="muted small">Submitted through the website form · {fmtDate(lead.at, { weekday: "short", day: "numeric", month: "short" })} at {lead.at.slice(11, 16)}</p>
            <KV
              rows={[
                ["Business", lead.companyName],
                ["Name", `${lead.firstName} ${lead.lastName}`, null, true],
                ["Email", lead.email || "—", null, true],
                ["Phone", lead.phone || "—", null, true],
                ["Website", lead.website || "—"],
              ]}
            />
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Message</p>
              <div className="desc" style={{ padding: 12, background: "var(--t-panel-2)", border: "1px solid var(--t-line)" }}><Priv>{lead.message || "—"}</Priv></div>
            </div>
            <div className="row">
              {lead.email && <a className="btn btn-sm" href={`mailto:${lead.email}`}><Mail size={12} /> Email</a>}
              {lead.phone && <a className="btn btn-sm" href={`tel:${lead.phone.replace(/\s/g, "")}`}><Phone size={12} /> Call</a>}
              {lead.website && <span className="btn btn-sm"><Globe size={12} /> {lead.website}</span>}
              <span className="spacer" />
              {/* Deals are created from the company's page (the prospect record this inquiry made). */}
              <button className="btn btn-sm btn-primary" onClick={() => { setSel(null); go(`/companies/${lead.id}`); }}>Create deal</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Alerts() {
  const { notifications, setNotifications } = useStore();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="hdr-drop">
      <button className="iconbtn" data-dropdown-trigger onClick={() => setOpen(!open)} title="Alerts" aria-label={`Alerts, ${unread} unread`} aria-expanded={open}>
        <Bell size={16} />
        {unread > 0 && <span className="pip">{unread}</span>}
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)}>
        <div className="dropdown-head">
          <span className="ptitle">Alerts</span>
          <button className="linkbtn" style={{ marginLeft: "auto" }} onClick={() => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))}>Mark all read</button>
        </div>
        {notifications.length === 0 && <div className="dropdown-item" style={{ gridTemplateColumns: "1fr" }}><span className="muted">All caught up.</span></div>}
        {notifications.slice(0, 12).map((n) => (
          <button
            key={n.id}
            className="dropdown-item"
            onClick={() => {
              setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
              if (n.href) {
                setOpen(false);
                go(n.href);
              }
            }}
          >
            <span className="sdot" data-s={n.read ? undefined : "warn"} style={{ marginTop: 5, opacity: n.read ? 0.25 : 1 }} />
            <span className={n.read ? "muted" : "strong"}>{n.body}</span>
            <span className="muted small">{n.at}</span>
          </button>
        ))}
        <button className="dropdown-foot" onClick={() => { setOpen(false); go("/notifications"); }}>All alerts</button>
      </Dropdown>
    </div>
  );
}

// The concept's "Logged in as" block; clicking it offers Sign out (the
// concept had no sign-out — the real app needs one).
function WhoAmI({ caller }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="whoami hdr-drop">
      <button className="label" data-dropdown-trigger onClick={() => setOpen(!open)} aria-expanded={open} style={{ textAlign: "right" }}>
        Logged in as: <b>{caller.name}</b><br />{caller.role}
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)} width={220}>
        <div className="dropdown-head"><span className="muted small">{caller.email}</span></div>
        <button
          className="dropdown-foot"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}

function Frame({ caller, counts, children }) {
  const path = usePathname();
  const router = useRouter();
  const { prefs, setPref } = useStore();
  const opened = prefs.openFolders || [];
  // Folders start closed so the rail reads as the eight big buttons; the
  // folder holding the current page still opens itself.
  const toggleFolder = (label) =>
    setPref("openFolders", opened.includes(label) ? opened.filter((l) => l !== label) : [...opened, label]);
  const [q, setQ] = useState("");
  const isActive = (href) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  const subActive = (href) => path === href || (href !== "/finance" && path.startsWith(`${href}/`));

  useEffect(() => {
    setNavigator((href) => router.push(href));
  }, [router]);

  // The content pane is its own scroller (as in the concept), so each new
  // screen starts at the top.
  useEffect(() => {
    document.querySelector(".gh-terminal .content")?.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    // "/" focuses search, ⇧P toggles the privacy blur.
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
      if (e.key === "P" && e.shiftKey && !typing) setPref("privacy", !prefs.privacy);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.privacy, setPref]);

  return (
    <div className="gh-terminal" data-theme={prefs.theme} data-private={prefs.privacy ? "on" : "off"} data-density={prefs.density}>
      <div className="backdrop" />
      <div className="app">
        <header className="header">
          <Link className="wordmark" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed local brand assets, sized by the concept CSS */}
            <img className="icon" src="/brand-icon.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="type" src="/email-wordmark.png" alt="Gray Horizon" />
          </Link>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search size={14} />
            <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients, deals, tasks…" aria-label="Search" />
            <kbd>/</kbd>
          </form>
          <div className="hdr-actions">
            <Inquiries />
            <button className="iconbtn" onClick={() => setPref("theme", prefs.theme === "dark" ? "light" : "dark")} title={prefs.theme === "dark" ? "Light mode" : "Dark mode"} aria-label="Toggle light or dark mode">
              {prefs.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="iconbtn" data-on={prefs.privacy || undefined} onClick={() => setPref("privacy", !prefs.privacy)} title="Blur private information (⇧P)" aria-label="Blur private information" aria-pressed={prefs.privacy}>
              {prefs.privacy ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <Alerts />
            <WhoAmI caller={caller} />
          </div>
        </header>

        <div className="body">
          <aside className="rail">
            {PRIMARY.map((n) => (
              <Link key={n.href} href={n.href} className="navbtn" data-active={isActive(n.href) || undefined} data-accent={n.accent || undefined}>
                <n.icon size={16} strokeWidth={1.75} />
                {n.label}
                {n.count && counts[n.count] ? <span className="count">{counts[n.count]}</span> : null}
              </Link>
            ))}
            {FOLDERS.map((f) => {
              const open = opened.includes(f.label) || f.items.some(([, href]) => subActive(href));
              return (
                <div key={f.label} style={{ display: "contents" }}>
                  <button className="navfolder" onClick={() => toggleFolder(f.label)} aria-expanded={open}>
                    {open ? <FolderOpen size={12} /> : <FolderClosed size={12} />} {f.label}
                    <ChevronDown size={12} className="chev" data-open={open || undefined} />
                  </button>
                  {open && (
                    <div className="subtree">
                      {f.items.map(([label, href, count]) => (
                        <Link key={href} href={href} className="subitem" data-active={subActive(href) || undefined}>
                          {label === "Email Triage" ? <Inbox size={11} /> : null}
                          {label}
                          {count && counts[count] ? <span className="count">{counts[count]}</span> : null}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>
          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** Mounted by the admin layout. `data` seeds the shell's own collections. */
export default function TerminalShell({ prefs, caller, counts, data, children }) {
  return (
    <PrefsProvider initial={prefs}>
      <StoreData data={data}>
        <Frame caller={caller} counts={counts}>{children}</Frame>
      </StoreData>
    </PrefsProvider>
  );
}

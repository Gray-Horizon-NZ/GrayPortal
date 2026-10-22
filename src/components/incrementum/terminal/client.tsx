"use client";
// The few client pieces the Terminal kit needs. Everything else is a
// server component; these only handle what the browser must: pop-ups,
// clickable rows, submit-on-change, the theme/privacy switches, the toast
// and the rail's remembered folders.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Form from "next/form";
import { X, Sun, Moon, Eye, EyeOff, Check, AlertTriangle, FolderOpen, FolderClosed, ChevronDown } from "lucide-react";

function openDialog(id: string) {
  const d = document.getElementById(id);
  if (d instanceof HTMLDialogElement && !d.open) d.showModal();
}

/** A button that opens the <Dialog> with this id. Extra props (data-*) pass through. */
export function OpenDialog({ target, className, children, title, ...rest }: { target: string; className?: string; children: React.ReactNode; title?: string } & Record<`data-${string}`, unknown>) {
  return (
    <button type="button" className={className} title={title} onClick={() => openDialog(target)} {...rest}>
      {children}
    </button>
  );
}

/**
 * The concept's Modal as a native <dialog>: Escape closes it, so does a
 * click on the backdrop, and so does submitting any form inside it (the
 * server action then refreshes the page underneath). `openOnLoad` opens it
 * straight away (e.g. `?new=1`).
 */
export function Dialog({ id, title, wide, children, openOnLoad }: { id: string; title: React.ReactNode; wide?: boolean; children: React.ReactNode; openOnLoad?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (openOnLoad && !d.open) d.showModal();
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    // Close after the submit has been handed to React (the action keeps running).
    const onSubmit = (e: SubmitEvent) => {
      if ((e.target as HTMLFormElement).dataset.keepOpen !== undefined) return;
      setTimeout(() => d.close(), 0);
    };
    d.addEventListener("click", onClick);
    d.addEventListener("submit", onSubmit);
    return () => {
      d.removeEventListener("click", onClick);
      d.removeEventListener("submit", onSubmit);
    };
  }, [openOnLoad]);
  return (
    <dialog ref={ref} id={id} className="modal" data-wide={wide || undefined} aria-label={typeof title === "string" ? title : undefined}>
      <header className="modal-head">
        <span className="ptitle">{title}</span>
        <button type="button" className="iconbtn" onClick={() => ref.current?.close()} aria-label="Close">
          <X size={16} />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

/** Close button for use inside a dialog's body. */
export function CloseDialog({ className = "btn", children = "Cancel" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close()}>
      {children}
    </button>
  );
}

/** A table row or block that opens a dialog or follows a link; inner buttons/links keep their own clicks. */
export function ClickRow({ as = "tr", dialog, href, className, children, title }: { as?: "tr" | "div"; dialog?: string; href?: string; className?: string; children: React.ReactNode; title?: string }) {
  const router = useRouter();
  const Tag = as;
  return (
    <Tag
      className={className}
      data-click
      title={title}
      onClick={(e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button, a, input, select, textarea, label, form")) return;
        if (dialog) openDialog(dialog);
        else if (href) router.push(href);
      }}
    >
      {children}
    </Tag>
  );
}

/** A server-action form that submits itself whenever a field changes (inline slot edits, selects). */
export function AutoSubmitForm({ action, className, children, style, keepOpen }: { action: (fd: FormData) => Promise<void>; className?: string; children: React.ReactNode; style?: React.CSSProperties; keepOpen?: boolean }) {
  return (
    <form action={action} className={className} style={style} data-keep-open={keepOpen ? "" : undefined} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </form>
  );
}

/** A GET filter form (next/form, so it navigates client-side) that applies on every change. */
export function FilterForm({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) {
  return (
    <Form action={action} className={className} scroll={false} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </Form>
  );
}

/** Range input that shows its value live and applies on release (inside a FilterForm). */
export function RangeField({ name, min, max, step, defaultValue, format }: { name: string; min: number; max: number; step: number; defaultValue: number; format: "money" | "plain" }) {
  const [v, setV] = useState(defaultValue);
  const shown = format === "money" ? (v >= max ? "Any" : `$${v.toLocaleString("en-NZ")}`) : String(v);
  return (
    <>
      <input type="range" name={name} min={min} max={max} step={step} value={v} onChange={(e) => setV(Number(e.target.value))} />
      <span className="range-val">{shown}</span>
    </>
  );
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/incrementum; max-age=31536000; samesite=lax`;
}

/** Light (default) / dark switch; remembered in a cookie so the server renders the right theme. */
export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setCookie("inc_theme", next);
    document.querySelector(".gh-incrementum")?.setAttribute("data-theme", next);
  };
  return (
    <button className="iconbtn" onClick={flip} title={theme === "dark" ? "Light mode" : "Dark mode"} aria-label="Toggle light or dark mode">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/** "Blur private information" (⇧P). */
export function PrivacyToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  useEffect(() => {
    document.querySelector(".gh-incrementum")?.setAttribute("data-private", on ? "on" : "off");
    setCookie("inc_private", on ? "on" : "off");
  }, [on]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "");
      if (e.key === "P" && e.shiftKey && !typing) setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <button className="iconbtn" data-on={on || undefined} onClick={() => setOn(!on)} title="Blur private information (⇧P)" aria-label="Blur private information" aria-pressed={on}>
      {on ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

/**
 * The concept's flash toast, fed by the ?ok= / ?error= the server actions
 * redirect with. Shows for a few seconds, then drops the param from the URL
 * so a refresh doesn't replay it.
 */
export function Toast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const ok = params.get("ok");
  const error = params.get("error");
  const [shown, setShown] = useState<{ text: string; bad: boolean } | null>(null);
  useEffect(() => {
    if (!ok && !error) return;
    setShown({ text: (error ?? ok) as string, bad: Boolean(error) });
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    const q = next.toString();
    window.history.replaceState(null, "", `${pathname}${q ? `?${q}` : ""}${window.location.hash}`);
    const t = setTimeout(() => setShown(null), error ? 9000 : 3200);
    return () => clearTimeout(t);
  }, [ok, error, params, pathname]);
  if (!shown) return null;
  return (
    <div className="flash" role={shown.bad ? "alert" : "status"} data-tone={shown.bad ? "bad" : undefined} onClick={() => setShown(null)}>
      {shown.bad ? <AlertTriangle size={14} /> : <Check size={14} />} {shown.text}
    </div>
  );
}

type NavFolder = { label: string; items: { label: string; href: string; count?: number }[] };

/** Rail folders: closed by default, the one holding the current page opens itself, open state remembered. */
export function RailFolders({ folders }: { folders: NavFolder[] }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState<string[]>([]);
  useEffect(() => {
    try {
      // Reading browser storage after mount is the point here (it can't be read on the server).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpened(JSON.parse(localStorage.getItem("inc-open-folders") || "[]"));
    } catch {}
  }, []);
  const toggle = (label: string) => {
    const next = opened.includes(label) ? opened.filter((l) => l !== label) : [...opened, label];
    setOpened(next);
    try {
      localStorage.setItem("inc-open-folders", JSON.stringify(next));
    } catch {}
  };
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      {folders.map((f) => {
        const open = opened.includes(f.label) || f.items.some((i) => isCurrent(i.href));
        return (
          <div key={f.label} className="navgroup" style={{ display: "contents" }}>
            <button className="navfolder" onClick={() => toggle(f.label)} aria-expanded={open}>
              {open ? <FolderOpen size={12} /> : <FolderClosed size={12} />} {f.label}
              <ChevronDown size={12} className="chev" data-open={open || undefined} />
            </button>
            {open && (
              <div className="subtree">
                {f.items.map((i) => (
                  <Link key={i.href} href={i.href} className="subitem" data-active={isCurrent(i.href) || undefined}>
                    {i.label}
                    {i.count ? <span className="count">{i.count}</span> : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** The concept's Seg tabs inside a pop-up: panes are server-rendered, only the choice is client state. */
export function PaneTabs({ tabs, small, hangar }: { tabs: { key: string; label: React.ReactNode; pane: React.ReactNode }[]; small?: boolean; hangar?: boolean }) {
  const [cur, setCur] = useState(tabs[0]?.key);
  return (
    <>
      <div className={hangar ? "hangtabs" : "seg"} data-small={small || undefined} role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" className={hangar ? "hangtab" : undefined} aria-selected={cur === t.key} data-active={cur === t.key || undefined} onClick={() => setCur(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} hidden={cur !== t.key}>
          {t.pane}
        </div>
      ))}
    </>
  );
}

/** A panel whose header carries the Seg tabs (concept: Reach out). */
export function TabbedPanel({ title, icon, tabs }: { title: React.ReactNode; icon?: React.ReactNode; tabs: { key: string; label: React.ReactNode; pane: React.ReactNode }[] }) {
  const [cur, setCur] = useState(tabs[0]?.key);
  return (
    <section className="panel">
      <header className="phead">
        {icon}
        <span className="ptitle">{title}</span>
        <span className="r">
          <span className="seg" data-small="" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={cur === t.key} data-active={cur === t.key || undefined} onClick={() => setCur(t.key)}>
                {t.label}
              </button>
            ))}
          </span>
        </span>
      </header>
      <div className="panel-pad">
        {tabs.map((t) => (
          <div key={t.key} hidden={cur !== t.key}>
            {t.pane}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Search box that hides sibling rows ([data-search]) inside the same parent that don't match. */
export function PickSearch({ placeholder = "Search…" }: { placeholder?: string }) {
  return (
    <input
      className="input"
      placeholder={placeholder}
      aria-label="Search"
      onChange={(e) => {
        const q = e.target.value.trim().toLowerCase();
        e.target.parentElement?.querySelectorAll<HTMLElement>("[data-search]").forEach((el) => {
          el.hidden = !!q && !(el.dataset.search ?? "").includes(q);
        });
      }}
    />
  );
}

/** "_back" for forms rendered outside a page (the rail's pop-ups): come back to wherever you were. */
export function CurrentPathField() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.toString();
  return <input type="hidden" name="_back" value={`${pathname}${q ? `?${q}` : ""}`} />;
}

/** Big block buttons: only the current page is solid gold. */
export function RailButton({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className="navbtn" data-active={active || undefined}>
      {children}
    </Link>
  );
}

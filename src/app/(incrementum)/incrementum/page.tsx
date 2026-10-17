import { getIncrementumSnapshot } from "@/lib/dal/incrementum/snapshot";
import { getHomeLayout } from "@/lib/dal/incrementum/planning";
import { WIDGETS, DEFAULT_WIDGET_ORDER, type WidgetKey } from "@/lib/incrementum/registry";
import { renderWidget, widgetHasContent } from "@/components/incrementum/widgets";
import { PageHead, Flash } from "@/components/incrementum/ui";
import IncrementumReadySignal from "@/components/incrementum/IncrementumReadySignal";
import SubmitButton from "@/components/ui/SubmitButton";
import { saveHomeLayoutAction, resetHomeLayoutAction } from "./actions";

export default async function IncrementumHome({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [s, layout] = await Promise.all([getIncrementumSnapshot(), getHomeLayout()]);
  const mode = s.mode;

  // Saved order first (keys still valid for this mode), then any new widgets
  // the registry gained since it was saved.
  const defaults = DEFAULT_WIDGET_ORDER[mode];
  const allowed = new Set<WidgetKey>(Object.keys(WIDGETS).filter((k) => (WIDGETS[k as WidgetKey].modes as readonly string[]).includes(mode)) as WidgetKey[]);
  const saved = (layout?.order ?? []).filter((k): k is WidgetKey => allowed.has(k as WidgetKey));
  const order = [...saved, ...defaults.filter((k) => !saved.includes(k)), ...[...allowed].filter((k) => !saved.includes(k) && !defaults.includes(k))];
  const hidden = new Set(layout?.hidden ?? []);
  const visible = order.filter((k) => !hidden.has(k) && (layout ? true : widgetHasContent(k, s)));

  const span = (k: WidgetKey) => {
    const w = WIDGETS[k] as { span: number; preSpan?: number };
    return mode === "pre" && w.preSpan ? w.preSpan : w.span;
  };

  return (
    <>
      <PageHead
        eyebrow={mode === "pre" ? "Pre-launch · Phase 0" : "Live"}
        title={
          <>
            Incrementum <em>Home</em>
          </>
        }
        lede={
          mode === "pre"
            ? "Everything the 27ADS scheme needs before ads go live. Work the launch checklist, recruit the bench, land the pilot client."
            : "The scheme is live. Leads, clients, contractors and the freedom number in one place."
        }
      />
      <Flash ok={ok} error={error} />

      <div className="inc-grid">
        {visible.map((k) => (
          <section key={k} className={`inc-cell inc-span-${span(k)}`} aria-label={WIDGETS[k].label}>
            {renderWidget(k, s, span(k) >= 8)}
          </section>
        ))}
      </div>

      <details className="inc-disclosure inc-panel">
        <summary>Customise Home</summary>
        <form action={saveHomeLayoutAction} style={{ display: "flex", flexDirection: "column", gap: "var(--gh-space-3)" }}>
          <input type="hidden" name="_back" value="/incrementum" />
          <p className="inc-small">Tick the widgets to show. Order: edit the comma-separated list (top to bottom).</p>
          <div className="inc-form">
            {order.map((k) => (
              <label key={k} className="inc-inline" style={{ fontSize: "var(--gh-text-sm)" }}>
                <input type="checkbox" name={`show_${k}`} defaultChecked={!hidden.has(k)} />
                {WIDGETS[k].label}
              </label>
            ))}
          </div>
          <label className="inc-field">
            Order
            <input className="gh-input" name="order" defaultValue={order.join(",")} />
          </label>
          <div className="inc-inline">
            <SubmitButton pendingLabel="Saving…">Save layout</SubmitButton>
          </div>
        </form>
        <form action={resetHomeLayoutAction}>
          <input type="hidden" name="_back" value="/incrementum" />
          <SubmitButton className="gh-btn-secondary" pendingLabel="Resetting…">
            Reset to default
          </SubmitButton>
        </form>
        <p className="inc-small">Pre-launch vs live mode switches automatically on the launch date (Settings). Saved per user, so it follows you across devices.</p>
      </details>
      <IncrementumReadySignal />
    </>
  );
}

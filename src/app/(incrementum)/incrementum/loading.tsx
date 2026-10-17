// Light, empty placeholder while an Incrementum page loads — never the
// (app) group's dark skeletons (plan §2.4: no dark flash). On entry the
// "Entering Project Incrementum" overlay sits on top of this anyway.
export default function IncrementumLoading() {
  return (
    <div className="inc-grid" aria-busy="true">
      <div className="inc-cell inc-span-12" style={{ minHeight: 120 }}>
        <div className="gh-skeleton" style={{ height: 14, width: 180 }} />
        <div className="gh-skeleton" style={{ height: 28, width: "60%" }} />
      </div>
      <div className="inc-cell inc-span-6" style={{ minHeight: 200 }} />
      <div className="inc-cell inc-span-6" style={{ minHeight: 200 }} />
    </div>
  );
}

// Light, empty placeholder while an Incrementum page loads — never the
// (app) group's dark skeletons (plan §2.4: no dark flash). On entry the
// "Entering Project Incrementum" overlay sits on top of this anyway.
export default function IncrementumLoading() {
  return (
    <div className="screen inc-loading" aria-busy="true">
      <div className="pagehead">
        <div>
          <h1>Loading</h1>
        </div>
      </div>
      <div style={{ minHeight: 260 }} />
      <div style={{ minHeight: 180 }} />
    </div>
  );
}

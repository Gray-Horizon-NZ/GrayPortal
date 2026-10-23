// Shown while a screen's data loads (most navigations are prefetched and
// skip it). Built from the concept's own panel and grid classes so the
// placeholder sits in the layout the screen is about to fill.
export default function Loading() {
  return (
    <div className="screen" aria-busy="true" aria-label="Loading">
      <div className="pagehead">
        <div>
          <span className="t-skel" style={{ width: 220, height: 26 }} />
          <span className="t-skel" style={{ width: 320, height: 12, marginTop: 10 }} />
        </div>
      </div>
      <div className="grid g-4">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="panel panel-pad">
            <span className="t-skel" style={{ width: "40%", height: 10 }} />
            <span className="t-skel" style={{ width: "70%", height: 24, marginTop: 12 }} />
          </section>
        ))}
      </div>
      <div className="grid g-2">
        {[0, 1].map((i) => (
          <section key={i} className="panel panel-pad">
            {[0, 1, 2, 3].map((j) => (
              <span key={j} className="t-skel" style={{ width: `${90 - j * 12}%`, height: 12, marginTop: j ? 14 : 0 }} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

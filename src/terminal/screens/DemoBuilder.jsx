"use client";
import { PageHead } from "../ui";

// Frames the GrayScale Demo Builder (public/demo-builder.html, a single self-contained page
// built in the GrayScale repo by `node demos/builder/make.mjs --portal`). The builder hides
// its own header when framed, so the portal's header and rail stay the only chrome.
export function DemoBuilder() {
  return (
    <div className="screen">
      <PageHead title="Demo builder" sub="Tick the modules, set the look and words, refresh the sample data, then download one demo file" />
      <iframe
        src="/demo-builder.html"
        title="Demo builder"
        style={{ width: "100%", height: "calc(100vh - 150px)", minHeight: 620, border: 0, display: "block", background: "transparent" }}
      />
    </div>
  );
}

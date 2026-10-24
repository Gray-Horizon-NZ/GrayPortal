// Copies the approved terminal concept's stylesheet into GrayPortal verbatim,
// scoped to the admin app. Every selector gets the `.gh-terminal` root
// (`:root` → `.gh-terminal`, `body` → `.gh-terminal`, everything else
// prefixed), so nothing leaks into the client portal, contractor workspace
// or Project Incrementum. Keyframes get a `t-` prefix for the same reason.
//
// Re-run after changing the concept:
//   node scripts/scope-terminal-css.mjs ../terminal-concepts/grayportal-terminal-concept/src/styles.css
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const [src = "../terminal-concepts/grayportal-terminal-concept/src/styles.css", out = "src/app/(app)/terminal.css"] = process.argv.slice(2);
const ROOT = ".gh-terminal";
const KEYFRAMES = ["screen-in", "fade", "pop", "inq-glow"];

function scopeSelector(sel) {
  const s = sel.trim();
  if (s.startsWith(":root")) return ROOT + s.slice(":root".length);
  if (s === "body") return ROOT;
  if (s === "html" || s === "#root") return null; // the root element sizes itself (see adapter)
  return `${ROOT} ${s}`;
}

const root = postcss.parse(readFileSync(src, "utf8"));
root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
  const scoped = rule.selectors.map(scopeSelector).filter(Boolean);
  if (scoped.length === 0) rule.remove();
  else rule.selectors = [...new Set(scoped)];
});
root.walkAtRules(/keyframes$/, (at) => {
  if (KEYFRAMES.includes(at.params)) at.params = `t-${at.params}`;
});
root.walkDecls(/^animation(-name)?$/, (decl) => {
  for (const k of KEYFRAMES) decl.value = decl.value.replace(new RegExp(`(^|\\s)${k}(?=\\s|$|,)`), `$1t-${k}`);
});

const header = `/* GENERATED — do not edit by hand.
 * The terminal concept's stylesheet (OS/GrayPortal/terminal-concepts/grayportal-terminal-concept/src/styles.css),
 * copied verbatim and scoped under ${ROOT} by scripts/scope-terminal-css.mjs.
 * Design rules: grayhorizon-docs/Terminal UI/RULES.md. GrayPortal-only
 * additions live in terminal-adapter.css, never here. */\n\n`;
writeFileSync(out, header + root.toString());
console.log(`wrote ${out}`);

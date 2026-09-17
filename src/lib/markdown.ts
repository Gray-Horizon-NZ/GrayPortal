import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Renders user-authored Markdown (meeting summaries pasted from a .md file
 * or written by hand) to sanitized HTML. Sanitized here, not just assumed
 * safe on the way in — MCP/API callers can write this content without ever
 * touching the browser, same reasoning as sanitizeEmailHtml.
 */
export function renderTrustedMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "del", "ul", "ol", "li", "a", "code", "pre",
      "blockquote", "h1", "h2", "h3", "h4", "hr", "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

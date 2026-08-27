import "server-only";
import sanitizeHtml from "sanitize-html";
import { stripHtmlToText } from "./text";

export { stripHtmlToText };

/**
 * The one place outbound HTML email gets its visual consistency (Open-Work-
 * Brief.md §2.4) — every send, one-off or campaign, passes its body through
 * wrapEmailHtml before it reaches the Gmail adapter, so no caller can
 * construct raw outbound HTML that skips the shell. Deliberately a light
 * background: dark HTML renders unreliably across Outlook/Gmail/Apple Mail,
 * and many clients read/print email in light mode regardless of app theme
 * — a departure from the app's own dark-first UI, scoped to email only.
 *
 * Hex values, not CSS custom properties — email HTML has no reliable
 * support for var(). Values below mirror the app's --gh-* tokens by hand.
 */

// Exported so other one-off callers building small HTML fragments outside
// wrapEmailHtml's own body (e.g. a fixed CTA button appended after
// admin-edited content) match these exactly instead of re-declaring them.
export const GOLD = "#b8a369";
export const INK = "#1a1a1a";
export const MUTED = "#6b6b6b";
const BORDER = "#e2ddd0";
const PAPER = "#f7f5f0";

const HEADING_FONT = "Georgia, 'Times New Roman', serif";
const BODY_FONT = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export function wrapEmailHtml(bodyHtml: string, opts?: { previewText?: string }): string {
  const preview = opts?.previewText ?? "";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
  </head>
  <body style="margin:0; padding:0; background:${PAPER}; font-family:${BODY_FONT};">
    ${preview ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preview)}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border:1px solid ${BORDER};">
            <tr>
              <td style="padding: 28px 32px; border-bottom: 2px solid ${GOLD};">
                <span style="font-family:${HEADING_FONT}; font-size:20px; letter-spacing:0.04em; color:${INK};">
                  Gray Horizon
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; font-family:${BODY_FONT}; font-size:15px; line-height:1.6; color:${INK};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 32px; border-top: 1px solid ${BORDER}; font-family:${BODY_FONT}; font-size:12px; color:${MUTED};">
                Gray Horizon &middot; Auckland, NZ
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Server-side sanitization for any HTML that will become outbound email
 * body content (template or campaign) — the UI preview isn't the only way
 * this content reaches storage (MCP/API callers bypass the client
 * entirely), so stripping <script>, external <style>, and on* handlers has
 * to happen here, not just in the browser. */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "table", "tr", "td", "th", "tbody", "thead", "span", "h1", "h2", "h3"]),
    allowedAttributes: {
      "*": ["style", "align", "width", "height", "class"],
      a: ["href", "name", "target"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    // No <style> blocks (many email clients strip <head> anyway — brief
    // §2.4) and no inline <script>, ever.
    nonTextTags: ["style", "script", "textarea", "option"],
  });
}

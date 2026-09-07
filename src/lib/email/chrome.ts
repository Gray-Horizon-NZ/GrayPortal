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
const MUTED_LIGHT = "#948e7f";
const BORDER = "#e2ddd0";
const PAPER = "#f7f5f0";

// Exported for the same reason GOLD/INK/MUTED are — other callers building
// headline moments in their own htmlBody (the signature "statement, then
// italic payoff" construction) should reuse this, not re-type the stack.
export const HEADING_FONT = "Georgia, 'Times New Roman', serif";
const BODY_FONT = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

// No incoming request in every context that builds email HTML (the campaign
// cron sender, in particular — see src/lib/dal/campaigns.ts's tracking-pixel
// comment), so this reads the same public-origin env var rather than
// threading appOrigin through every caller. Not secret — it's the app's own
// public domain, same NEXT_PUBLIC_ exception as the Firebase config values.
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grayhorizon.nz";
}

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
              <td style="padding: 28px 32px; border-bottom: 2px solid ${MUTED};">
                <img src="${appUrl()}/email-wordmark.png" width="180" height="39" alt="Gray Horizon" style="display:block; border:0; outline:none;" />
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

/**
 * The one canonical "primary action" button for email — centralized so
 * every CTA in the system looks identical regardless of which template
 * produced it (gh_email_style_guide_v1.md §5), and so a caller appending a
 * fixed CTA after editable content (sendOnboardingInvite's invite link) and
 * a caller previewing that same template (sendTestEmailTemplate) render the
 * exact same button rather than the preview silently omitting it.
 */
export function ctaButtonHtml(label: string, href: string): string {
  return `<p style="margin: 28px 0 0;"><a href="${href}" style="display:inline-block; padding:12px 28px; background:${GOLD}; color:${INK}; text-decoration:none; font-weight:600; border-radius:0;">${label}</a></p>`;
}

const PORTAL_INVITE_WHATS_INSIDE: { label: string; description: string }[] = [
  { label: "Live status", description: "See exactly what we're focused on right now and what's coming next — no need to ask." },
  { label: "Documents", description: "Every brief, report and asset we've produced, kept in one place instead of scattered across email." },
  { label: "Services & invoices", description: "A clear breakdown of what you're paying for, and access to past invoices whenever you need them." },
];

function portalInviteRowHtml(label: string, description: string, isLast: boolean): string {
  const border = isLast ? `border-top:1px solid ${BORDER}; border-bottom:1px solid ${BORDER};` : `border-top:1px solid ${BORDER};`;
  return `<tr>
    <td width="110" style="width:110px; vertical-align:top; padding:8px 12px 8px 0; ${border} font-family:${BODY_FONT}; font-weight:600; font-size:12.5px; color:${INK};">${escapeHtml(label)}</td>
    <td style="vertical-align:top; padding:8px 0; ${border} font-family:${BODY_FONT}; font-size:12px; color:${MUTED}; line-height:1.45;">${escapeHtml(description)}</td>
  </tr>`;
}

/**
 * Portal-invite-only email shell — "Concept 1, minimal classic expanded"
 * (Downloads/gray-portal-invite-emails-revised.html, picked by Max over the
 * two-column-hero alternative). Deliberately NOT built on wrapEmailHtml:
 * that function's thick banner header/footer bar is the "one canonical
 * shell" for recurring/campaign sends (chrome.ts's own top comment), but
 * this is a client's very first impression of the portal — a quiet,
 * centered, letter-like layout reads better here than the standard chrome,
 * same reasoning that already made sendOnboardingInvite bypass sendEmail()
 * for its Gmail send. The three "what's inside" rows and the footer
 * signature are fixed chrome, not admin-editable — same invariant as the
 * CTA button below: only the heading's client name and the intro paragraph
 * come from the admin-edited template.
 */
export function wrapPortalInviteEmailHtml(opts: {
  clientName: string;
  introHtml: string;
  ctaHref: string;
  fromName?: string;
  expiresInDays: number;
}): string {
  const { clientName, introHtml, ctaHref, fromName = "Max Fawcett", expiresInDays } = opts;
  const rows = PORTAL_INVITE_WHATS_INSIDE.map((r, i) => portalInviteRowHtml(r.label, r.description, i === PORTAL_INVITE_WHATS_INSIDE.length - 1)).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
  </head>
  <body style="margin:0; padding:0; background:${PAPER}; font-family:${BODY_FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td align="center" style="padding-bottom:18px;">
                <div style="font-family:${BODY_FONT}; font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:${MUTED_LIGHT};">Gray Horizon</div>
                <div style="font-family:${HEADING_FONT}; font-size:14px; letter-spacing:.02em; color:${INK}; margin-top:2px;">Portal</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:10px;">
                <h2 style="margin:0; font-family:${HEADING_FONT}; font-size:22px; font-weight:600; color:${INK}; line-height:1.3;">Your client portal is ready, ${escapeHtml(clientName)}.</h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px; font-family:${BODY_FONT}; font-size:13.5px; color:${MUTED}; line-height:1.55;">
                ${introHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:26px;">
                <a href="${ctaHref}" style="display:inline-block; padding:11px 24px; background:${GOLD}; color:#ffffff; text-decoration:none; font-weight:600; font-size:13.5px; font-family:${BODY_FONT}; border-radius:4px;">Setup your portal</a>
                <div style="margin-top:12px; font-family:${BODY_FONT}; font-size:12px; color:${MUTED};">Or copy this link: ${ctaHref}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 20px;"><div style="width:30px; height:1px; background:${BORDER}; margin:0 auto;"></div></td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:8px; font-family:${BODY_FONT}; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:${MUTED_LIGHT};">What's inside</td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px; font-family:${BODY_FONT}; font-size:11.5px; color:${MUTED_LIGHT}; line-height:1.5;">
                ${escapeHtml(fromName)}<br />
                Gray Horizon<br />
                This invite link is unique to you and expires in ${expiresInDays} days.
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

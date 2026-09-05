import "server-only";
import { google, gmail_v1 } from "googleapis";
import { authedClient } from "./adapter";

/**
 * Phase 10 — the single Gmail adapter module, same posture as adapter.ts's
 * Calendar/Tasks functions: nothing else in the app talks to the Gmail API
 * directly. Unlike Calendar/Tasks sync, a failed *send* has nothing to
 * silently degrade to — the caller (src/lib/dal/emails.ts) surfaces send
 * failures as real errors rather than a soft "skipped" state.
 */

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMessage(opts: { from: string; to: string; subject: string; bodyText: string; bodyHtml?: string }): string {
  const headers = [`From: ${opts.from}`, `To: ${opts.to}`, `Subject: ${opts.subject}`, "MIME-Version: 1.0"];

  if (!opts.bodyHtml) {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    return toBase64Url(`${headers.join("\r\n")}\r\n\r\n${opts.bodyText}`);
  }

  // multipart/alternative — plain-text fallback first, HTML part last, per
  // RFC 2046's "most preferred alternative last" convention.
  const boundary = `gh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    opts.bodyText,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    opts.bodyHtml,
    `--${boundary}--`,
  ].join("\r\n");
  return toBase64Url(`${headers.join("\r\n")}\r\n\r\n${parts}`);
}

export type SentEmail = { gmailMessageId: string; gmailThreadId: string; from: string; sentAt: Date };

export async function sendGmail(opts: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): Promise<SentEmail | null> {
  const auth = await authedClient();
  if (!auth) return null;
  const gmail = google.gmail({ version: "v1", auth });

  const profile = await gmail.users.getProfile({ userId: "me" });
  const from = profile.data.emailAddress;
  if (!from) throw new Error("Could not resolve the connected Gmail account's address");

  const raw = buildRawMessage({ from, to: opts.to, subject: opts.subject, bodyText: opts.bodyText, bodyHtml: opts.bodyHtml });
  const { data } = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  if (!data.id || !data.threadId) throw new Error("Gmail send did not return a message id");

  return { gmailMessageId: data.id, gmailThreadId: data.threadId, from, sentAt: new Date() };
}

export type InboundMessage = {
  gmailMessageId: string;
  gmailThreadId: string;
  fromAddress: string;
  toAddresses: string[];
  subject: string | null;
  snippet: string | null;
  sentAt: Date;
};

export type InboundSyncResult = {
  status: "synced" | "skipped";
  messages: InboundMessage[];
  nextHistoryId: string | null;
};

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Depth-first search for the first part of a given MIME type — prefers a
 * part actually holding body data over a multipart container of the same
 * declared type. */
function findPart(part: gmail_v1.Schema$MessagePart | undefined, mimeType: string): gmail_v1.Schema$MessagePart | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

export type GmailMessageBody = { html: string | null; text: string | null };

/**
 * Fetches one message's actual body content, on demand — nothing in the
 * regular sync path (fetchInboundMessages above) ever stores more than a
 * snippet, so this is the only place a full email body is read. Same
 * fail-soft shape as the rest of this file: no connection or any API error
 * returns null rather than throwing, since the caller (a "view this email"
 * click) should degrade to an error message, not crash the page.
 */
export async function getGmailMessage(gmailMessageId: string): Promise<GmailMessageBody | null> {
  try {
    const auth = await authedClient();
    if (!auth) return null;
    const gmail = google.gmail({ version: "v1", auth });

    const { data } = await gmail.users.messages.get({ userId: "me", id: gmailMessageId, format: "full" });
    const payload = data.payload;
    if (!payload) return null;

    // A non-multipart message carries its body directly on the top-level
    // payload rather than in a parts[] array.
    const htmlPart = findPart(payload, "text/html") ?? (payload.mimeType === "text/html" ? payload : null);
    const textPart = findPart(payload, "text/plain") ?? (payload.mimeType === "text/plain" ? payload : null);

    return {
      html: htmlPart?.body?.data ? fromBase64Url(htmlPart.body.data) : null,
      text: textPart?.body?.data ? fromBase64Url(textPart.body.data) : null,
    };
  } catch (err) {
    console.error("getGmailMessage failed", err);
    return null;
  }
}

function parseAddresses(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((a) => {
      const match = a.match(/<([^>]+)>/);
      return (match ? match[1] : a).trim().toLowerCase();
    })
    .filter(Boolean);
}

/**
 * Incremental sync via Gmail's history.list, bootstrapped on first run
 * (brief §6: inbound matching, not a full inbox import). Skips any message
 * whose sender is the connected account itself, since history.list also
 * surfaces mail *we* sent — that side is already logged by sendGmail's
 * caller, not this polling path.
 */
export async function fetchInboundMessages(storedHistoryId: string | null): Promise<InboundSyncResult> {
  const auth = await authedClient();
  if (!auth) return { status: "skipped", messages: [], nextHistoryId: null };
  const gmail = google.gmail({ version: "v1", auth });

  const profile = await gmail.users.getProfile({ userId: "me" });
  const ownAddress = (profile.data.emailAddress ?? "").toLowerCase();

  let messageIds: string[] = [];
  let nextHistoryId: string | null = storedHistoryId;

  if (!storedHistoryId) {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: "in:inbox newer_than:1d",
      maxResults: 25,
    });
    messageIds = (data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
    nextHistoryId = profile.data.historyId ?? null;
  } else {
    try {
      const { data } = await gmail.users.history.list({
        userId: "me",
        startHistoryId: storedHistoryId,
        historyTypes: ["messageAdded"],
      });
      const seen = new Set<string>();
      for (const record of data.history ?? []) {
        for (const added of record.messagesAdded ?? []) {
          const id = added.message?.id;
          const labelIds = added.message?.labelIds ?? [];
          if (id && labelIds.includes("INBOX") && !seen.has(id)) {
            seen.add(id);
            messageIds.push(id);
          }
        }
      }
      nextHistoryId = data.historyId ?? storedHistoryId;
    } catch (err) {
      // Gmail retains history for ~1 week; an expired cursor 404s. Reset to
      // null so the next run re-bootstraps instead of failing forever.
      console.error("Gmail history.list failed, cursor likely expired", err);
      return { status: "skipped", messages: [], nextHistoryId: null };
    }
  }

  const messages: InboundMessage[] = [];
  for (const id of messageIds) {
    const { data } = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject"],
    });
    const fromAddress = parseAddresses(headerValue(data.payload?.headers, "From"))[0];
    if (!fromAddress || fromAddress === ownAddress) continue;
    if (!data.id || !data.threadId) continue;
    messages.push({
      gmailMessageId: data.id,
      gmailThreadId: data.threadId,
      fromAddress,
      toAddresses: parseAddresses(headerValue(data.payload?.headers, "To")),
      subject: headerValue(data.payload?.headers, "Subject"),
      snippet: data.snippet ?? null,
      sentAt: data.internalDate ? new Date(Number(data.internalDate)) : new Date(),
    });
  }

  return { status: "synced", messages, nextHistoryId };
}

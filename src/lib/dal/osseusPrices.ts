import "server-only";
import { createHmac } from "node:crypto";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { auditLog, grayscaleProducts } from "@/lib/db/schema";
import { withAdminScope } from "./session";
import { linkSecret } from "./osseusLink";

// GrayPortal reads Osseus's price list (GrayScale BUILD-PLAN J3: one price
// list, in Osseus's src/core/products.ts). grayscale_products stays the table
// every screen reads (the portal's GrayScale page and request check, the Demo
// Builder and Deal Closer feeds), but its rows now follow Osseus: at most once
// an hour per instance, the first read pulls the list and brings the rows in
// line. A product Osseus no longer lists is soft-deleted, so old client
// requests that name it still read. If Osseus can't be reached, the rows stay
// as they were and it tries again in 10 minutes.
//
// Signed with the link secret: x-grayportal-ts (ms) + x-grayportal-signature =
// hex HMAC-SHA256 of "prices.<ts>" (Osseus: src/core/demos/grayportal-link.ts
// verifyGrayPortal). Prices only, nothing about any client.

const OK_EVERY = 60 * 60_000;
const RETRY_EVERY = 10 * 60_000;

const PriceList = z.object({
  at: z.string(),
  products: z.array(z.object({
    key: z.string().regex(/^[a-z]{2,30}$/),
    name: z.string().min(1).max(80),
    category: z.string().max(80),
    monthly: z.number().min(0).max(100_000).nullable(),
    desc: z.string().max(1000),
    sort: z.number().int(),
  })).min(1).max(50),
});
export type OsseusPriceList = z.infer<typeof PriceList>;

export function osseusUrl(): string | null {
  return process.env.OSSEUS_URL?.trim().replace(/\/+$/, "") || null;
}

export function signPrices(secret: string, ts: string): string {
  return createHmac("sha256", secret).update(`prices.${ts}`).digest("hex");
}

/** The price list from Osseus, or null when the link is off or Osseus doesn't answer properly. */
export async function fetchOsseusPrices(timeoutMs = 3000): Promise<OsseusPriceList | null> {
  const url = osseusUrl(), secret = linkSecret();
  if (!url || !secret) return null;
  const ts = String(Date.now());
  try {
    const r = await fetch(`${url}/api/link/prices`, {
      headers: { "x-grayportal-ts": ts, "x-grayportal-signature": signPrices(secret, ts) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Osseus said ${r.status}`);
    const parsed = PriceList.safeParse(await r.json());
    if (!parsed.success) throw new Error("Osseus's price list didn't read");
    return parsed.data;
  } catch (err) {
    console.error("Osseus price list unavailable", err);
    return null;
  }
}

/** The old codename a row may still carry (rows were named Nuntius, Meridian... before D23). */
const codename = (key: string) => key[0].toUpperCase() + key.slice(1);

/**
 * Brings grayscale_products in line with a price list. Matches each product on its name or its old
 * codename, so a rename keeps the row. Returns what changed. A list without Osseus in it is refused,
 * so a broken answer can't empty the catalogue.
 */
export async function applyPriceList(list: OsseusPriceList) {
  if (!list.products.some((p) => p.key === "osseus")) throw new Error("Price list without Osseus refused");
  return withAdminScope("Osseus price list sync", async (tx) => {
    const rows = await tx.select().from(grayscaleProducts);
    const changed: string[] = [];
    const keep: string[] = [];
    for (const p of list.products) {
      const row = rows.find((r) => r.name === p.name) ?? rows.find((r) => r.name === codename(p.key));
      const monthly = p.monthly == null ? null : p.monthly.toFixed(2);
      const values = { name: p.name, category: p.category, description: p.desc, monthlyPriceNzd: monthly, sortOrder: p.sort };
      if (!row) {
        const [made] = await tx.insert(grayscaleProducts).values(values).returning({ id: grayscaleProducts.id });
        await tx.insert(auditLog).values({ actorUserId: null, actorType: "system" as const, entityType: "grayscale_product", entityId: made.id, action: "create", fieldChanges: { name: { old: null, new: p.name }, monthlyPriceNzd: { old: null, new: monthly } } });
        keep.push(made.id);
        changed.push(`added ${p.name}`);
        continue;
      }
      keep.push(row.id);
      const diff: Record<string, { old: unknown; new: unknown }> = {};
      if (row.name !== values.name) diff.name = { old: row.name, new: values.name };
      if ((row.category ?? "") !== values.category) diff.category = { old: row.category, new: values.category };
      if ((row.description ?? "") !== values.description) diff.description = { old: row.description, new: values.description };
      if ((row.monthlyPriceNzd == null ? null : Number(row.monthlyPriceNzd)) !== p.monthly) diff.monthlyPriceNzd = { old: row.monthlyPriceNzd, new: monthly };
      if (row.sortOrder !== values.sortOrder) diff.sortOrder = { old: row.sortOrder, new: values.sortOrder };
      if (row.deletedAt) diff.deletedAt = { old: row.deletedAt, new: null };
      if (!Object.keys(diff).length) continue;
      await tx.update(grayscaleProducts).set({ ...values, deletedAt: null, updatedAt: new Date() }).where(eq(grayscaleProducts.id, row.id));
      await tx.insert(auditLog).values({ actorUserId: null, actorType: "system" as const, entityType: "grayscale_product", entityId: row.id, action: "update", fieldChanges: diff });
      changed.push(`updated ${p.name}`);
    }
    const gone = await tx.update(grayscaleProducts).set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(isNull(grayscaleProducts.deletedAt), notInArray(grayscaleProducts.id, keep)))
      .returning({ id: grayscaleProducts.id, name: grayscaleProducts.name });
    for (const g of gone) {
      await tx.insert(auditLog).values({ actorUserId: null, actorType: "system" as const, entityType: "grayscale_product", entityId: g.id, action: "delete", fieldChanges: { deletedAt: { old: null, new: new Date().toISOString() } } });
      changed.push(`removed ${g.name}`);
    }
    return changed;
  });
}

let nextTry = 0;
let running: Promise<void> | null = null;

/** Keeps grayscale_products following Osseus. Throttled per instance, never throws, never blocks past ~3 s. */
export async function syncPricesFromOsseus(opts: { force?: boolean } = {}): Promise<void> {
  if (!osseusUrl() || !linkSecret()) return;
  if (!opts.force && Date.now() < nextTry) return;
  if (running) return running;
  running = (async () => {
    nextTry = Date.now() + RETRY_EVERY;
    const list = await fetchOsseusPrices();
    if (!list) return;
    try {
      const changed = await applyPriceList(list);
      if (changed.length) console.log(`Osseus price list (${list.at}): ${changed.join(", ")}`);
      nextTry = Date.now() + OK_EVERY;
    } catch (err) {
      console.error("Osseus price list sync failed", err);
    }
  })().finally(() => { running = null; });
  return running;
}

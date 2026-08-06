// Phase 7 — parses gh_pricing_framework_v5.md (the standalone Proposer
// agent's own source of truth, see ../ai-agents/Proposer/CLAUDE.md) into
// service_modules/service_items. Run by hand after the source file changes
// — this is the "re-import/re-sync" the brief calls for instead of a
// parallel editing UI. Upserts keyed on the framework's own ids, so
// re-running is safe (never destructive, never a bulk replace).
//
// Run with: node scripts/import-pricing.mjs
import { Client } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Resolved relative to this file's directory (scripts/) via import.meta.url
// below — two levels up gets from grayportal/scripts/ to OS/, then into
// the sibling ai-agents/Proposer/ folder where the source file lives.
const SOURCE_PATH = "../../ai-agents/Proposer/gh_pricing_framework_v5.md";

const P2_MODULE = {
  code: "P2",
  name: "Existing-Client-Only Services",
  focus: "Internal use only — never proactively surfaced to a new client without explicit sign-off.",
};

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function extractTables(text) {
  const lines = text.split("\n");
  const tables = [];
  let current = [];
  for (const line of lines) {
    if (line.trim().startsWith("|")) {
      current.push(line);
    } else if (current.length) {
      tables.push(current);
      current = [];
    }
  }
  if (current.length) tables.push(current);
  return tables.map((block) => ({
    header: splitRow(block[0]),
    rows: block.slice(2).map(splitRow), // block[1] is the --- separator
  }));
}

function classifyShape(header) {
  if (header.some((h) => /client-supplied/i.test(h))) return "creative";
  if (header.includes("Tier")) return "tier";
  if (header.includes("Inclusion")) return "inclusion";
  if (header.includes("Reference Price")) return "referencePrice";
  if (header.includes("Current") && header.includes("Suggested")) return "standard";
  if (header.includes("Pricing")) return "pricingText";
  return "unknown";
}

function parseDollar(s) {
  const m = s.match(/\$?([\d,]+(?:\.\d+)?)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

// Classifies one price cell's raw text. "numeric" covers flat one-off
// figures and "$X mo" / "$X / $Y mo" recurring figures alike — the caller
// combines this with the deliverable's "(R)" marker to settle on a final
// billing type; a bare number here doesn't by itself mean one-off.
function parsePriceCell(raw) {
  const text = (raw ?? "").trim();
  if (!text) return { setup: null, monthly: null, kind: "custom", text };

  const rangeMatch = text.match(/^\$?([\d,]+(?:\.\d+)?)\s*[–-]\s*\$?([\d,]+(?:\.\d+)?)$/);
  if (rangeMatch) return { setup: null, monthly: null, kind: "range", text };

  if (text.includes("/")) {
    const [left, right] = text.split("/").map((s) => s.trim());
    const setup = parseDollar(left);
    const monthlyMatch = right.match(/\$?([\d,]+(?:\.\d+)?)\s*mo/i);
    const monthly = monthlyMatch ? Number(monthlyMatch[1].replace(/,/g, "")) : null;
    if (setup !== null || monthly !== null) return { setup, monthly, kind: "numeric", text };
  }

  const monthlyOnly = text.match(/^\$?([\d,]+(?:\.\d+)?)\s*mo$/i);
  if (monthlyOnly) {
    return { setup: null, monthly: Number(monthlyOnly[1].replace(/,/g, "")), kind: "numeric", text };
  }

  const flat = text.match(/^\$?([\d,]+(?:\.\d+)?)$/);
  if (flat) return { setup: Number(flat[1].replace(/,/g, "")), monthly: null, kind: "numeric", text };

  return { setup: null, monthly: null, kind: "custom", text };
}

function combineBillingType(deliverableName, parsedCells) {
  const isRecurring = /\(R\)/.test(deliverableName);
  if (parsedCells.some((p) => p?.kind === "range")) return "range";
  if (isRecurring || parsedCells.some((p) => p?.monthly !== null && p?.monthly !== undefined)) return "monthly";
  if (parsedCells.some((p) => p?.kind === "custom")) return "custom";
  return "one_off";
}

function stripId(cell) {
  return cell.replace(/`/g, "").trim();
}

function moduleCodeFromId(id) {
  return id.split("-")[0].toUpperCase();
}

function parseItems(text) {
  const items = [];
  for (const table of extractTables(text)) {
    const shape = classifyShape(table.header);
    if (shape === "unknown") continue;

    for (const cells of table.rows) {
      const id = stripId(cells[0] ?? "");
      if (!id || !/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(id)) continue; // skip malformed/separator rows
      const moduleCode = moduleCodeFromId(id);

      if (shape === "standard") {
        const deliverable = cells[1];
        const current = parsePriceCell(cells[2]);
        const suggested = parsePriceCell(cells[3]);
        const billingType = combineBillingType(deliverable, [current, suggested]);
        items.push({
          id,
          moduleCode,
          deliverable,
          isRecurring: /\(R\)/.test(deliverable),
          billingType,
          currentSetupPrice: current.setup,
          currentMonthlyPrice: current.monthly,
          suggestedSetupPrice: suggested.setup,
          suggestedMonthlyPrice: suggested.monthly,
          priceText:
            billingType === "range" || billingType === "custom"
              ? [
                  current.kind !== "numeric" ? `Current: ${current.text}` : null,
                  suggested.kind !== "numeric" ? `Suggested: ${suggested.text}` : null,
                ]
                  .filter(Boolean)
                  .join("; ") || null
              : null,
          notes: null,
        });
      } else if (shape === "creative") {
        const deliverable = cells[1];
        const current = parsePriceCell(cells[2]);
        const suggested = parsePriceCell(cells[3]);
        const fromScratch = cells[4];
        const billingType = combineBillingType(deliverable, [current, suggested]);
        items.push({
          id,
          moduleCode,
          deliverable,
          isRecurring: /\(R\)/.test(deliverable),
          billingType,
          currentSetupPrice: current.setup,
          currentMonthlyPrice: current.monthly,
          suggestedSetupPrice: suggested.setup,
          suggestedMonthlyPrice: suggested.monthly,
          priceText: null,
          notes: `Client-supplied vs from-scratch pricing — from scratch: ${fromScratch}`,
        });
      } else if (shape === "tier") {
        const deliverable = cells[1];
        const suggested = parsePriceCell(cells[2]);
        items.push({
          id,
          moduleCode,
          deliverable,
          isRecurring: false,
          billingType: suggested.kind === "numeric" ? "one_off" : suggested.kind,
          currentSetupPrice: null,
          currentMonthlyPrice: null,
          suggestedSetupPrice: suggested.kind === "numeric" ? suggested.setup : null,
          suggestedMonthlyPrice: suggested.kind === "numeric" ? suggested.monthly : null,
          priceText: suggested.kind === "numeric" ? null : suggested.text,
          notes: null,
        });
      } else if (shape === "inclusion") {
        items.push({
          id,
          moduleCode,
          deliverable: cells[1],
          isRecurring: false,
          billingType: "custom",
          currentSetupPrice: null,
          currentMonthlyPrice: null,
          suggestedSetupPrice: null,
          suggestedMonthlyPrice: null,
          priceText: null,
          notes: "Included on any retainer — not sold standalone.",
        });
      } else if (shape === "referencePrice") {
        const deliverable = cells[1];
        const parsed = parsePriceCell(cells[2]);
        const billingType =
          parsed.kind === "range" ? "range" : parsed.monthly !== null ? "monthly" : parsed.kind === "numeric" ? "one_off" : "custom";
        items.push({
          id,
          moduleCode,
          deliverable,
          isRecurring: /\(R\)/.test(deliverable),
          billingType,
          currentSetupPrice: parsed.setup,
          currentMonthlyPrice: parsed.monthly,
          suggestedSetupPrice: null,
          suggestedMonthlyPrice: null,
          priceText: billingType === "range" || billingType === "custom" ? parsed.text : null,
          notes: null,
        });
      } else if (shape === "pricingText") {
        const deliverable = cells[1];
        const parsed = parsePriceCell(cells[2]);
        items.push({
          id,
          moduleCode,
          deliverable,
          isRecurring: /\(R\)/.test(deliverable),
          billingType: parsed.kind === "numeric" ? (parsed.monthly !== null ? "monthly" : "one_off") : "custom",
          currentSetupPrice: parsed.kind === "numeric" ? parsed.setup : null,
          currentMonthlyPrice: parsed.kind === "numeric" ? parsed.monthly : null,
          suggestedSetupPrice: null,
          suggestedMonthlyPrice: null,
          priceText: parsed.kind === "numeric" ? null : parsed.text,
          notes: null,
        });
      }
    }
  }
  return items;
}

function parseModules(text) {
  const archSection = text.slice(text.indexOf("## 2. Service Architecture"), text.indexOf("## 3. Part 1"));
  const [table] = extractTables(archSection);
  const modules = table.rows
    .filter((cells) => cells[0]?.includes("**"))
    .map((cells) => ({
      code: cells[0].replace(/\*/g, "").trim(),
      name: cells[1].trim(),
      focus: cells[2]?.trim() || null,
    }));
  modules.push(P2_MODULE);
  return modules;
}

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

try {
  const fullText = readFileSync(new URL(SOURCE_PATH, import.meta.url), "utf8");
  const modules = parseModules(fullText);

  const itemsSection = fullText.slice(fullText.indexOf("## 3. Part 1"), fullText.indexOf("## 6. Freebies"));
  const items = parseItems(itemsSection);

  await client.query("BEGIN");
  await client.query("SELECT set_config('app.role', 'admin', true)");

  for (const m of modules) {
    await client.query(
      `INSERT INTO service_modules (code, name, focus) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, focus = EXCLUDED.focus`,
      [m.code, m.name, m.focus]
    );
  }
  console.log(`Upserted ${modules.length} service modules.`);

  for (const it of items) {
    await client.query(
      `INSERT INTO service_items (
         id, module_code, deliverable, is_recurring, billing_type,
         current_setup_price, current_monthly_price, suggested_setup_price, suggested_monthly_price,
         price_text, notes, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (id) DO UPDATE SET
         module_code = EXCLUDED.module_code,
         deliverable = EXCLUDED.deliverable,
         is_recurring = EXCLUDED.is_recurring,
         billing_type = EXCLUDED.billing_type,
         current_setup_price = EXCLUDED.current_setup_price,
         current_monthly_price = EXCLUDED.current_monthly_price,
         suggested_setup_price = EXCLUDED.suggested_setup_price,
         suggested_monthly_price = EXCLUDED.suggested_monthly_price,
         price_text = EXCLUDED.price_text,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [
        it.id,
        it.moduleCode,
        it.deliverable,
        it.isRecurring,
        it.billingType,
        it.currentSetupPrice,
        it.currentMonthlyPrice,
        it.suggestedSetupPrice,
        it.suggestedMonthlyPrice,
        it.priceText,
        it.notes,
      ]
    );
  }
  console.log(`Upserted ${items.length} service items.`);

  await client.query("COMMIT");
  console.log("Import complete.");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  throw err;
} finally {
  await client.end();
}

"use client";
import { useEffect } from "react";
import "./apexus-tool.css";

// The builder's markup, unchanged from the original standalone tool
// (public/apexus/quote-builder.html) — every id here is a real DOM
// binding the logic in public/apexus/quote-builder.js reaches via
// document.getElementById, so this can't be restructured into normal
// JSX without rewriting that logic too. Rendered via dangerouslySetInnerHTML
// specifically so it participates in GrayPortal's own page (sidebar stays,
// no navigation away, styled by apexus-tool.css) instead of living in a
// separate document.
const BUILDER_MARKUP = `
<div class="app">
  <div class="builder">
    <h1>Gray Horizon Quote Builder</h1>
    <div class="sub">SITE-BRANDED · INTERNAL TOOL · CURRENT PRICING</div>

    <section>
      <h2>Quick-Start Packages</h2>
      <div class="pkg-row">
        <button class="pkg-btn" onclick="applyPackage('foundation')">Foundation</button>
        <button class="pkg-btn" onclick="applyPackage('growth')">Growth</button>
        <button class="pkg-btn" onclick="applyPackage('full')">Full Engagement</button>
      </div>
      <button class="clear-btn" onclick="clearAll()">Clear all selections</button>
      <div class="note">Presets pre-check items below — everything stays fully editable after. Scroll down for the full à la carte catalogue.</div>
    </section>

    <section>
      <h2>Client &amp; Proposal</h2>
      <label class="field">Client contact name</label>
      <input type="text" id="f_contact" placeholder="Daniel Thompson">
      <label class="field">Client company</label>
      <input type="text" id="f_company" placeholder="Apex Performance NZ">
      <label class="field">Quote title / tier name</label>
      <input type="text" id="f_tier" placeholder="Growth Partner Quote" value="Growth Partner Quote">
      <label class="field">Document date (shown on the document + used in the filename)</label>
      <input type="month" id="f_filedate">
      <label class="field">Prepared by</label>
      <input type="text" id="f_preparedby" placeholder="Max Fawcett" value="Max Fawcett">
      <label class="field">Intro line (optional, 1–2 sentences)</label>
      <textarea id="f_intro" placeholder="A short line on what this package builds and who it's for."></textarea>
      <label class="field">"What This Includes" benefits — page 2 (one per line: Headline: supporting sentence). Leave blank to use the default pain-point set (time, tool knowledge, setup confidence).</label>
      <textarea id="f_benefits" placeholder="No time lost learning ad platforms: You're running a business, not an ads agency — we manage this end-to-end.&#10;No guesswork with tools you don't use daily: This is the software we live in every day.&#10;No wondering if it's set up right: Tracking and campaigns are configured and monitored by us, to industry standard." style="min-height:70px;"></textarea>
    </section>

    <section>
      <h2>GS — Growth Strategy</h2>
      <table class="admin-table">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_gs"></tbody>
      </table>
    </section>

    <section>
      <h2>GA — Growth &amp; Acquisition</h2>
      <table class="admin-table">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_ga"></tbody>
      </table>
    </section>

    <section>
      <h2>Creative Content &amp; Ad Creative</h2>
      <table class="admin-table">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_creative"></tbody>
      </table>
    </section>

    <section>
      <h2>Web Dev</h2>
      <label class="field">Site tier</label>
      <select id="f_webdev_tier"></select>
      <label class="field" id="f_webdev_price_label">Quoted price — one-off (editable)</label>
      <input type="number" id="f_webdev_price" placeholder="0">
      <div class="note" id="f_webdev_note"></div>
      <div class="note" id="f_webdev_cloudflare_note"></div>
      <div class="webdev-free-row">
        <input type="checkbox" id="free_webdev" class="free-chk" onchange="recalc()">
        <label for="free_webdev">Give web dev away as a freebie/bonus</label>
      </div>
    </section>

    <section>
      <h2>AO — Automated Operations</h2>
      <table class="admin-table">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_ao"></tbody>
      </table>
    </section>

    <section>
      <h2>SS — Systems &amp; Software (manual)</h2>
      <div id="grp_ss"></div>
      <button class="add-row-btn" onclick="addSSRow()">+ Add custom SS line</button>
      <div class="note">Yuvi × 2–3, value-adjusted. Confirm IP assignment before quoting if Gray Scale-bound.</div>
    </section>

    <section>
      <h2>Gray Scale Products (self-serve)</h2>
      <div class="toggle-row">
        <input type="checkbox" id="f_existing_client" onchange="recalc()">
        <label for="f_existing_client">Existing signed GH retainer client (auto 20% off Gray Scale)</label>
      </div>
      <table class="admin-table" style="margin-top:8px;">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_grayscale_catalogue"></tbody>
      </table>
      <div class="note" style="margin-top:0;">Same as every catalogue above — unchecked by default, tick to include in this quote.</div>
      <div id="grp_grayscale" style="margin-top:8px;"></div>
      <button class="add-row-btn" onclick="addGSRow()">+ Add a one-off Gray Scale product (not in the catalogue above)</button>
    </section>

    <section style="background:rgba(193,117,83,0.08); margin-left:-24px; margin-right:-24px; padding-left:24px; padding-right:24px;">
      <h2 style="color:var(--gh-danger);">Part 2 — Existing Clients Only (Internal)</h2>
      <div class="note" style="margin-top:0; margin-bottom:8px;">Reference pricing for signed clients only. Never surface to a new prospect — confirm scope manually before quoting.</div>
      <table class="admin-table">
        <tr><th></th><th>Item</th><th class="num">One-off</th><th class="num">Recurring</th><th class="ctr">Free?</th></tr>
        <tbody id="grp_part2"></tbody>
      </table>
    </section>

    <section>
      <h2>Freebies, Bonuses &amp; Upsells</h2>
      <div class="note" style="margin-top:0;">Standard no-cost extras below, plus any item marked "Free?" above — everything lands together in one callout on the quote, with its listed price counted as perceived value.</div>
      <div id="grp_freebies" style="margin-top:8px;"></div>
      <label class="field">Freebie context note (optional)</label>
      <input type="text" id="f_freebie_note" placeholder="e.g. for the first 90 days">
    </section>

    <section>
      <h2>Terms &amp; Adjustments</h2>
      <div class="toggle-row" style="margin-top:0;">
        <input type="checkbox" id="f_adspend_toggle" onchange="recalc()">
        <label for="f_adspend_toggle">Include recommended ad spend (skip if not running ads for this client)</label>
      </div>
      <label class="field">Recommended ad spend range (shown to client, not calculated)</label>
      <input type="text" id="f_adspend" placeholder="$2,000–4,000/mo">
      <div class="radio-inline" style="margin-top:10px;">
        <label><input type="radio" name="setupbilling" value="split" checked> Setup split over 3mo</label>
        <label><input type="radio" name="setupbilling" value="upfront"> Setup billed upfront</label>
      </div>
      <label class="field">Warm-lead discount on setup only (%)</label>
      <input type="number" id="f_warmlead" value="0" min="0" max="100">
      <div class="toggle-row">
        <input type="checkbox" id="f_gst">
        <label for="f_gst">Show totals GST-inclusive (+15%)</label>
      </div>
    </section>

    <button class="print-btn" onclick="createChildDocument()">Create Document</button>
    <div class="note">Downloads a standalone client-facing copy with only the items you've checked above (freebies baked in, Part 2 never included). The client opens it, toggles within your curated menu, and hits "Save PDF" to send back their chosen package.</div>
    <div class="note" id="create_status" style="display:none; color: var(--gh-text-primary); font-weight:500;"></div>
  </div>

  <div class="preview-wrap">
   <div class="pages-col">
    <div class="page">
      <div class="page-body">
        <div class="brand">
          <div>
            <div class="brand-name"><span class="wm-gray">Gray</span><span class="wm-horizon">Horizon</span></div>
            <div class="brand-tag">Big Business Thinking, Built For NZ</div>
          </div>
          <div class="brand-meta">
            <strong id="p_tier">Growth Partner Quote</strong> — <span id="p_contact">Client Name</span><br>
            <span id="p_company">Client Company</span> · <span id="p_date">Month Year</span>
          </div>
        </div>

        <h1 class="doc-title" id="p_title">Growth Partner Quote <em>— Client Name</em></h1>
        <div class="doc-sub"><span id="p_company2">Client Company</span> · <span id="p_date2">Month Year</span></div>

        <div class="intro" id="p_intro_wrap" style="display:none;">
          <span id="p_intro"></span>
        </div>

        <div class="section-label">Investment Summary</div>
        <div class="invest-grid" id="p_invest_grid">
          <div class="invest-card">
            <div class="price-label">One-Time Setup</div>
            <div class="price" id="p_setup_total">$0</div>
            <div class="price-desc" id="p_setup_desc">Billed upfront</div>
          </div>
          <div class="invest-card">
            <div class="price-label">Monthly Retainer</div>
            <div class="price" id="p_monthly_total">$0/mo</div>
            <div class="price-desc">Marketing modules, billed monthly</div>
          </div>
          <div class="invest-card" id="p_adspend_card">
            <div class="price-label">Recommended Ad Spend</div>
            <div class="price" id="p_adspend">—</div>
            <div class="price-desc">Paid directly to Meta/Google</div>
          </div>
        </div>

        <div class="section-label">What's Included</div>
        <div id="p_items_wrap">
          <table class="items-table" id="p_items_table">
            <tr><th>Deliverable</th><th>Cadence</th><th>Price</th></tr>
          </table>
          <div class="discount-line" id="p_discount_line"></div>
        </div>
        <div class="empty-hint" id="p_empty_hint">No modules selected yet — check items on the left to build this quote.</div>

        <div id="p_grayscale_wrap" style="display:none;">
          <div class="section-label">Gray Scale Products</div>
          <div class="section-note" id="p_grayscale_note" style="display:none;"></div>
          <table class="items-table" id="p_grayscale_table">
            <tr><th>Product</th><th>Cadence</th><th>Price</th></tr>
          </table>
        </div>

        <div class="callout" id="p_freebie_wrap" style="display:none;">
          <strong id="p_freebie_heading">Included at no additional cost:</strong> <span id="p_freebie_list"></span>
          <div class="value-total" id="p_freebie_value" style="display:none;"></div>
        </div>

        <div class="incl-note">
          <strong>Always included:</strong> monthly strategy session, GH-HQ portal access, Quarterly Business Review, reporting rhythm and priority response (Retained Advisory). Ads Management includes retargeting.
        </div>

        <div class="terms" id="p_terms"></div>

        <div class="scroll-note">Please scroll for additional information<div class="chevron">⌄</div></div>
      </div>

      <div class="page-footer">
        <span>Gray Horizon · grayhorizon.nz</span>
        <span>Prepared by <span id="p_preparedby">—</span></span>
      </div>
    </div>

    <div class="page page-break">
      <div class="page-body">
        <div class="brand">
          <div>
            <div class="brand-name"><span class="wm-gray">Gray</span><span class="wm-horizon">Horizon</span></div>
            <div class="brand-tag">Big Business Thinking, Built For NZ</div>
          </div>
          <div class="brand-meta">
            <strong>Total Cost Breakdown</strong> — <span id="p2_contact">Client Name</span><br>
            <span id="p2_company">Client Company</span> · <span id="p2_date">Month Year</span>
          </div>
        </div>

        <h1 class="doc-title">Total Cost Breakdown</h1>
        <div class="doc-sub">Your one-time setup and monthly retainer, combined for month one — then monthly retainer only from month two onward</div>

        <div class="section-label">Combined Monthly Cost</div>
        <table class="items-table" id="p2_items_table">
          <tr><th>Item</th><th>Cadence</th><th>Price</th></tr>
        </table>

        <div class="invest-grid" style="margin-top:16px;">
          <div class="invest-card">
            <div class="price-label">First Month Payment</div>
            <div class="price" id="p2_first_month">$0</div>
            <div class="price-desc">Setup + first month retainer, billed together</div>
          </div>
          <div class="invest-card">
            <div class="price-label">Monthly From Month 2</div>
            <div class="price" id="p2_monthly2">$0/mo</div>
            <div class="price-desc">Retainer only, ongoing</div>
          </div>
        </div>

        <div class="callout" id="p2_breakdown_text" style="margin-top:14px;"></div>

        <div class="section-label">What This Includes</div>
        <div id="p2_includes_wrap"></div>
      </div>

      <div class="page-footer">
        <span>Gray Horizon · grayhorizon.nz</span>
        <span>Prepared by <span id="p_preparedby2">—</span></span>
      </div>
    </div>
   </div>
  </div>
</div>
`;

/**
 * Mounts the Apexus tool's markup + logic inside GrayPortal's own page —
 * no iframe, no separate document, no navigation away. The script
 * (public/apexus/quote-builder.js) is injected fresh on every mount and
 * removed on unmount, so leaving /apexus and coming back re-fetches live
 * pricing and rebuilds the catalogue rather than running on stale state.
 */
export default function ApexusBuilder() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/apexus/quote-builder.js";
    script.async = false;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return <div className="apexus-tool" dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />;
}

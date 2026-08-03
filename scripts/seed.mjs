// Seeds the allowlist (users must exist here before first Google sign-in
// can succeed — see src/lib/dal/allowlist.ts) and a realistic NZ SME/
// mid-market pipeline shape, per the brief's instruction that seed data
// should reflect real Gray Horizon deal shape, not generic fixtures.
//
// Run with: node scripts/seed.mjs
import { Client } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client(process.env.DATABASE_URL_UNPOOLED);
await client.connect();

// Runs as the Neon owner, so bypass RLS deliberately for seeding by setting
// role to admin for the session (owner already has implicit access via
// table ownership, but session vars are still required by policy checks
// since RLS applies even to non-superusers unless BYPASSRLS is granted —
// the owner role here does have BYPASSRLS by default as table owner).
await client.query("BEGIN");
// Owner role typically has BYPASSRLS, but set the session vars anyway so
// this script still works if that ever changes.
await client.query("SELECT set_config('app.role', 'admin', true)");

const users = [
  { email: "max@grayhorizon.nz", role: "admin", displayName: "Max Fawcett" },
  { email: "admin@grayhorizon.nz", role: "admin", displayName: "Gray Horizon Admin" },
  { email: "yuvrajs.batra@gmail.com", role: "contractor", displayName: "Yuvraj Batra" },
];

for (const u of users) {
  await client.query(
    `INSERT INTO users (email, role, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [u.email, u.role, u.displayName]
  );
}
console.log(`Seeded ${users.length} allowlisted users.`);

const companies = [
  {
    name: "Kōura Coastal Seafoods",
    industry: "Food & Beverage",
    region: "Nelson",
    website: "kouracoastal.co.nz",
    size_band: "11-50",
    source: "Referral",
    status: "active",
    notes: "Export-focused, wants premium brand refresh ahead of Asia expansion.",
  },
  {
    name: "Tararua Ridge Construction",
    industry: "Construction",
    region: "Wellington",
    website: "tararuaridge.co.nz",
    size_band: "51-200",
    source: "Cold outreach",
    status: "active",
    notes: "Multiple site managers, needs simple lead-gen site + local SEO.",
  },
  {
    name: "Halcyon Dental Group",
    industry: "Healthcare",
    region: "Auckland",
    website: "halcyondental.nz",
    size_band: "11-50",
    source: "LinkedIn",
    status: "active",
    notes: "3 clinics, wants unified booking funnel across locations.",
  },
  {
    name: "Ferngrove Legal",
    industry: "Professional Services",
    region: "Christchurch",
    website: "ferngrovelegal.co.nz",
    size_band: "1-10",
    source: "Referral",
    status: "active",
    notes: "Boutique commercial law firm, premium positioning important.",
  },
  {
    name: "Southern Alps Adventure Co",
    industry: "Tourism",
    region: "Queenstown",
    website: "southernalpsadventure.nz",
    size_band: "11-50",
    source: "Trade show",
    status: "active",
    notes: "Seasonal cashflow, wants off-season booking campaign.",
  },
];

const companyIds = {};
for (const c of companies) {
  const res = await client.query(
    `INSERT INTO companies (name, industry, region, website, size_band, source, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [c.name, c.industry, c.region, c.website, c.size_band, c.source, c.status, c.notes]
  );
  companyIds[c.name] = res.rows[0].id;
}
console.log(`Seeded ${companies.length} companies.`);

const contacts = [
  { company: "Kōura Coastal Seafoods", firstName: "Aroha", lastName: "Ngata", roleTitle: "Managing Director", email: "aroha@kouracoastal.co.nz", phone: "+64 21 555 0142" },
  { company: "Tararua Ridge Construction", firstName: "Dave", lastName: "Mitchell", roleTitle: "Operations Manager", email: "dave@tararuaridge.co.nz", phone: "+64 27 555 0198" },
  { company: "Halcyon Dental Group", firstName: "Priya", lastName: "Chand", roleTitle: "Practice Manager", email: "priya@halcyondental.nz", phone: "+64 21 555 0177" },
  { company: "Ferngrove Legal", firstName: "James", lastName: "Ferngrove", roleTitle: "Founding Partner", email: "james@ferngrovelegal.co.nz", phone: "+64 21 555 0133" },
  { company: "Southern Alps Adventure Co", firstName: "Kate", lastName: "Sullivan", roleTitle: "Owner", email: "kate@southernalpsadventure.nz", phone: "+64 27 555 0166" },
];

const contactIds = {};
for (const c of contacts) {
  const res = await client.query(
    `INSERT INTO contacts (company_id, first_name, last_name, role_title, email, phone)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [companyIds[c.company], c.firstName, c.lastName, c.roleTitle, c.email, c.phone]
  );
  contactIds[c.company] = res.rows[0].id;
}
console.log(`Seeded ${contacts.length} contacts.`);

const today = new Date();
const inDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const deals = [
  {
    company: "Kōura Coastal Seafoods",
    stage: "Proposal out",
    value_nzd: 18500,
    package_tier: "Premium",
    close_probability: 60,
    next_action: "Follow up on proposal — check with Aroha on board sign-off",
    next_action_date: inDays(3),
    source: "Referral",
  },
  {
    company: "Tararua Ridge Construction",
    stage: "Meeting booked",
    value_nzd: 9200,
    package_tier: "Standard",
    close_probability: 40,
    next_action: "Discovery call — scope local SEO + lead gen site",
    next_action_date: inDays(2),
    source: "Cold outreach",
  },
  {
    company: "Halcyon Dental Group",
    stage: "Pitch delivered",
    value_nzd: 24000,
    package_tier: "Premium",
    close_probability: 55,
    next_action: "Send updated pitch deck with 3-clinic booking flow",
    next_action_date: inDays(4),
    source: "LinkedIn",
  },
  {
    company: "Ferngrove Legal",
    stage: "Won",
    value_nzd: 14500,
    package_tier: "Standard",
    close_probability: 100,
    next_action: "Kick off onboarding — brand discovery session",
    next_action_date: inDays(7),
    source: "Referral",
  },
  {
    company: "Southern Alps Adventure Co",
    stage: "Contacted",
    value_nzd: 7800,
    package_tier: "Standard",
    close_probability: 20,
    next_action: "Send capability deck ahead of shoulder-season push",
    next_action_date: inDays(5),
    source: "Trade show",
  },
];

for (const d of deals) {
  const res = await client.query(
    `INSERT INTO deals (company_id, primary_contact_id, stage, value_nzd, package_tier, close_probability, next_action, next_action_date, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      companyIds[d.company],
      contactIds[d.company],
      d.stage,
      d.value_nzd,
      d.package_tier,
      d.close_probability,
      d.next_action,
      d.next_action_date,
      d.source,
    ]
  );

  await client.query(
    `INSERT INTO activities (deal_id, type, occurred_at, body, outcome)
     VALUES ($1, 'note', now(), $2, 'Logged during seed')`,
    [res.rows[0].id, `Deal created at stage ${d.stage}.`]
  );
}
console.log(`Seeded ${deals.length} deals with opening activities.`);

await client.query("COMMIT");
await client.end();
console.log("Seed complete.");

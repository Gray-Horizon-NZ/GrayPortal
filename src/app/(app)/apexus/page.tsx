import { redirect } from "next/navigation";

// No iframe — a same-origin iframe here fought the app's own blanket
// frame-ancestors 'none' / X-Frame-Options: DENY security headers (every
// route gets them; relaxing them just for this one path adds a
// special-cased security exception, and even with that fix in place a
// fronting CDN can keep serving a stale cached "blocked" response for a
// static asset regardless). A real HTTP redirect to the tool's own static
// page sidesteps all of that — it's a full page load either way, and this
// is exactly the URL that already works when opened directly.
export default function ApexusPage() {
  redirect("/apexus/quote-builder.html");
}

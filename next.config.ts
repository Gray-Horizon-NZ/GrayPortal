import type { NextConfig } from "next";

// Security headers per brief §5.6. Cloudflare (once fronting the custom
// domain) can add its own layer on top of these, but the app must not
// depend on that — these apply regardless of what's in front of it.
const csp = (frameAncestors: string) =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.googleusercontent.com https://firebasestorage.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://lookerstudio.google.com https://datastudio.google.com https://drive.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp("'none'") },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Static pages the admin app shows inside its own screens (Brand guidelines,
// Demo Builder). They may be framed by GrayPortal itself and nothing else.
// Listed after the catch-all so these two keys override it (Next: last match wins).
const SELF_FRAMED = ["/brand-guidebook.html", "/demo-builder.html"];
const selfFramedHeaders = [
  { key: "Content-Security-Policy", value: csp("'self'") },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  // Default Server Action body limit is 1MB — the Vault MOP upload accepts
  // hand-prepared ZIPs well beyond that (see dal/mop.ts's 200MB cap).
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    // Client-side router cache for dynamic pages (Next 15+ defaults this to
    // 0): a page visited in the last 60s reopens instantly from memory, and
    // loading skeletons are reused for 5 minutes. Server actions still
    // invalidate it, so edits show straight away.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  // Project Incrementum: "Engagements" became "Clients" (Max, 2026-10-22).
  async redirects() {
    return [
      { source: "/incrementum/engagements", destination: "/incrementum/clients", permanent: true },
      { source: "/incrementum/engagements/:id", destination: "/incrementum/clients/:id", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...SELF_FRAMED.map((source) => ({ source, headers: selfFramedHeaders })),
    ];
  },
};

export default nextConfig;

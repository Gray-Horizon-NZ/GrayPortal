import type { NextConfig } from "next";

// Security headers per brief §5.6. Cloudflare (once fronting the custom
// domain) can add its own layer on top of these, but the app must not
// depend on that — these apply regardless of what's in front of it.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://*.googleusercontent.com",
      "connect-src 'self' https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://lookerstudio.google.com https://datastudio.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// /apexus embeds the Apexus quote-builder tool (public/apexus/quote-builder.html)
// in an same-origin <iframe> — the blanket frame-ancestors 'none' / X-Frame-Options:
// DENY above blocks that outright (browsers refuse to render a framed
// document that forbids framing, even same-origin). This narrower policy
// only relaxes the frame-ancestors/X-Frame-Options directives, scoped to
// this one admin-only path, and only to 'self' — nothing outside
// app.grayhorizon.nz can frame it either way.
const apexusHeaders = securityHeaders.map((h) =>
  h.key === "Content-Security-Policy"
    ? { ...h, value: h.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") }
    : h.key === "X-Frame-Options"
      ? { ...h, value: "SAMEORIGIN" }
      : h
);

const nextConfig: NextConfig = {
  // Default Server Action body limit is 1MB — the Vault MOP upload accepts
  // hand-prepared ZIPs well beyond that (see dal/mop.ts's 200MB cap).
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  async headers() {
    return [
      {
        source: "/apexus/:path*",
        headers: apexusHeaders,
      },
      {
        source: "/:path((?!apexus).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

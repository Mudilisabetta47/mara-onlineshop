import path from "node:path";
const isDev = process.env.NODE_ENV !== "production";
// Umgebung wie in src/lib/config.ts (APP_ENV, sonst aus VERCEL_ENV abgeleitet)
const rawAppEnv = (process.env.APP_ENV ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
const appEnv = ["local", "staging", "production"].includes(rawAppEnv)
  ? rawAppEnv
  : process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? "staging" : "local";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.stripe.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://*.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // staging/local dürfen nie in Suchmaschinen landen
  ...(appEnv === "production" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve("."),
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 768, 1024, 1280, 1600, 1920, 2400],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [{ pathname: "/seed/**" }, { pathname: "/media/**" }, { pathname: "/brand/**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

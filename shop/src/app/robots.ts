import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { isLive } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  // Nur die Live-Umgebung darf indexiert werden
  if (!isLive()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/api/", "/login", "/register", "/forgot-password", "/reset-password", "/wishlist"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}

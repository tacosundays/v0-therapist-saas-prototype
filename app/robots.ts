import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/privacy", "/terms", "/security", "/accessibility"],
      disallow: ["/dashboard/", "/client-portal/", "/portal/", "/api/", "/auth/"],
    },
    sitemap: "https://sessionsteps.com/sitemap.xml",
  }
}

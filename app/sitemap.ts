import type { MetadataRoute } from "next"

const publicPaths = [
  "",
  "/pricing",
  "/privacy",
  "/terms",
  "/security",
  "/baa",
  "/acceptable-use",
  "/data-retention",
  "/subprocessors",
  "/cookies",
  "/accessibility",
  "/ai-and-emergency-use",
]

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: `https://sessionsteps.com${path}`,
    changeFrequency: path === "" || path === "/pricing" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/pricing" ? 0.9 : 0.5,
  }))
}

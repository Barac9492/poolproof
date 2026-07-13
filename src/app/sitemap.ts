import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://poolproof.dev";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/how`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.8 },
  ];
}

import type { MetadataRoute } from "next";
import { listProjects } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://poolproof.dev";
  const projects = await listProjects();
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/oneshot`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/how`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/docs`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/docs/writing-specs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/docs/building`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/credits`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.6 },
    ...projects.map((p) => ({
      url: `${base}/p/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}

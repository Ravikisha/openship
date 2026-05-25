import { docsSource, resourcesSource } from "@/lib/source";

const BASE_URL = "https://openship.io";

export default async function sitemap() {
  const now = new Date().toISOString();

  const staticRoutes = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/resources", priority: 0.9, changeFrequency: "daily" },
    { path: "/docs", priority: 0.9, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  ].map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const docsRoutes = docsSource.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const resourceRoutes = resourcesSource.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: (page.data as { date?: string }).date || now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...docsRoutes, ...resourceRoutes];
}

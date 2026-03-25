import type { NewsItem } from "@/lib/news-data";

/** Category filter tabs — add/remove/reorder entries here to customize the filter bar. */
export const CATEGORY_FILTERS: { label: string; value: NewsItem["category"] | "ALL" }[] = [
  { label: "ALL", value: "ALL" },
  { label: "GOVT", value: "GOVT" },
  { label: "CORP", value: "CORP" },
  { label: "ECON", value: "ECON" },
  { label: "MKTG", value: "MKTG" },
  { label: "CMDTY", value: "CMDTY" },
  { label: "FX", value: "FX" },
  { label: "TECH", value: "TECH" },
];

/** Color mapping per category — used in the news feed rows. */
export const CATEGORY_COLORS: Record<string, string> = {
  GOVT: "text-bb-blue",
  CORP: "text-bb-green",
  ECON: "text-bb-amber",
  MKTG: "text-bb-orange",
  CMDTY: "text-bb-red",
  FX: "text-[#cc66ff]",
  TECH: "text-[#00cccc]",
};

/** How many news items to generate on initial load. */
export const INITIAL_NEWS_COUNT = 30;

/** Interval range (ms) between incoming news items [min, max]. */
export const NEWS_INTERVAL: [number, number] = [2000, 5000];

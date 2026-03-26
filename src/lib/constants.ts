import type { NewsItem } from "@/lib/news-data";

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

export const REGION_FILTERS: { label: string; value: NewsItem["region"] | "ALL" }[] = [
  { label: "ALL", value: "ALL" },
  { label: "US", value: "US" },
  { label: "EU", value: "EU" },
  { label: "APAC", value: "APAC" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  GOVT: "text-bb-blue",
  CORP: "text-bb-green",
  ECON: "text-bb-amber",
  MKTG: "text-bb-orange",
  CMDTY: "text-bb-red",
  FX: "text-[#cc66ff]",
  TECH: "text-[#00cccc]",
};

export const REGION_COLORS: Record<string, string> = {
  US: "text-bb-blue",
  EU: "text-bb-green",
  APAC: "text-bb-amber",
};

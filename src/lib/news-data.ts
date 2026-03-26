export interface NewsItem {
  id: string;
  time: string;
  headline: string;
  source: string;
  category: "GOVT" | "CORP" | "ECON" | "MKTG" | "CMDTY" | "FX" | "TECH";
  urgency: "FLASH" | "URGENT" | "NORMAL";
  body: string;
  region: "US" | "EU" | "APAC";
  link: string;
  timestamp: string;
}

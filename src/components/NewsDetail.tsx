"use client";

import type { NewsItem } from "@/lib/news-data";

export default function NewsDetail({ item }: { item: NewsItem | null }) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-bb-muted text-xs">
        SELECT A HEADLINE TO VIEW DETAILS (↑↓ + ENTER)
      </div>
    );
  }

  return (
    <div className="p-3 text-xs space-y-2 overflow-y-auto h-full">
      <div className="flex items-center gap-2">
        {item.urgency !== "NORMAL" && (
          <span className={`px-1 ${item.urgency === "FLASH" ? "bg-bb-red" : "bg-bb-amber"} text-bb-black font-bold`}>
            {item.urgency}
          </span>
        )}
        <span className="text-bb-muted">{item.time}</span>
        <span className="text-bb-muted">{item.source}</span>
        <span className="text-bb-orange">{item.category}</span>
      </div>
      <h2 className="text-bb-bright font-bold text-sm leading-tight">{item.headline}</h2>
      <p className="text-bb-white leading-relaxed">{item.body}</p>
      <div className="text-bb-muted pt-2 border-t border-bb-border/30">
        ID: {item.id} | ESC TO CLOSE | TAB TO RETURN TO SEARCH
      </div>
    </div>
  );
}

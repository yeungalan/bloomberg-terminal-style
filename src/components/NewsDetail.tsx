"use client";

import type { NewsItem } from "@/lib/news-data";
import { REGION_COLORS } from "@/lib/constants";
import { useState, useEffect } from "react";

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => relativeTime(iso));
  useEffect(() => {
    const id = setInterval(() => setText(relativeTime(iso)), 15000);
    return () => clearInterval(id);
  }, [iso]);
  return <span className="text-bb-amber">{text}</span>;
}

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
        <span className={`font-bold ${REGION_COLORS[item.region] ?? ""}`}>{item.region}</span>
        <span className="text-bb-muted">{item.time}</span>
        {item.timestamp && <RelativeTime iso={item.timestamp} />}
        <span className="text-bb-muted">{item.source}</span>
        <span className="text-bb-orange">{item.category}</span>
      </div>
      <h2 className="text-bb-bright font-bold text-sm leading-tight">{item.headline}</h2>
      <p className="text-bb-white leading-relaxed">{item.body}</p>
      {item.link && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-bb-blue hover:underline block">
          → FULL ARTICLE (O)
        </a>
      )}
      <div className="text-bb-muted pt-2 border-t border-bb-border/30">
        ID: {item.id} | ESC/ENTER TO CLOSE | O OPEN LINK
      </div>
    </div>
  );
}

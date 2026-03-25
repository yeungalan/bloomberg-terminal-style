"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NewsItem } from "@/lib/news-data";

const CATEGORY_COLORS: Record<string, string> = {
  GOVT: "text-bb-blue",
  CORP: "text-bb-green",
  ECON: "text-bb-amber",
  MKTG: "text-bb-orange",
  CMDTY: "text-bb-red",
  FX: "text-[#cc66ff]",
  TECH: "text-[#00cccc]",
};

function NewsRow({ item, isSelected, onSelect }: {
  item: NewsItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isNew = useRef(true);
  const className = [
    "flex gap-2 px-2 py-0.5 text-xs leading-5 border-b border-bb-border/30 cursor-default",
    isSelected ? "bg-bb-orange/20 text-bb-bright" : "hover:bg-bb-dark",
    item.urgency === "FLASH" ? "text-bb-red font-bold" : item.urgency === "URGENT" ? "text-bb-amber" : "",
    isNew.current ? "flash-new" : "",
  ].join(" ");

  useEffect(() => { isNew.current = false; }, []);

  return (
    <div className={className} onClick={onSelect} role="row" aria-selected={isSelected}>
      <span className="text-bb-muted w-18 shrink-0">{item.time}</span>
      <span className={`w-12 shrink-0 ${CATEGORY_COLORS[item.category] ?? ""}`}>{item.category}</span>
      <span className="w-14 shrink-0 text-bb-muted">{item.source}</span>
      {item.urgency !== "NORMAL" && (
        <span className={`shrink-0 ${item.urgency === "FLASH" ? "text-bb-red" : "text-bb-amber"}`}>
          *{item.urgency}*
        </span>
      )}
      <span className="truncate">{item.headline}</span>
    </div>
  );
}

export default function NewsFeed({ items, selectedId, onSelect }: {
  items: NewsItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const selectedIdx = items.findIndex((n) => n.id === selectedId);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIdx < 0 || !containerRef.current) return;
    const rows = containerRef.current.querySelectorAll("[role=row]");
    rows[selectedIdx]?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center px-2 py-1 bg-bb-dark border-b border-bb-border text-[10px] text-bb-muted">
        <span>NEWS FEED — {items.length} ITEMS</span>
        <span>{autoScroll ? "▼ LIVE" : "⏸ PAUSED"} | ↑↓ NAVIGATE | ENTER SELECT | HOME/END JUMP</span>
      </div>
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0" role="grid">
        {items.map((item) => (
          <NewsRow key={item.id} item={item} isSelected={item.id === selectedId} onSelect={() => onSelect(item.id)} />
        ))}
      </div>
    </div>
  );
}

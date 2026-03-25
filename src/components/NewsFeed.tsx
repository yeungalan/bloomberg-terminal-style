"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NewsItem } from "@/lib/news-data";
import { CATEGORY_COLORS } from "@/lib/constants";

function NewsRow({ item, isSelected, isNew, onSelect }: {
  item: NewsItem;
  isSelected: boolean;
  isNew: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={[
        "flex gap-2 px-2 py-0.5 text-xs leading-5 border-b border-bb-border/30 cursor-default",
        isSelected ? "bg-bb-orange/20 text-bb-bright" : "hover:bg-bb-dark",
        item.urgency === "FLASH" ? "text-bb-red font-bold" : item.urgency === "URGENT" ? "text-bb-amber" : "",
        isNew ? "flash-new" : "",
      ].join(" ")}
      onClick={onSelect}
      role="row"
      aria-selected={isSelected}
    >
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
  const prevCountRef = useRef(items.length);
  const selectedIdx = items.findIndex((n) => n.id === selectedId);

  // Track which items are "new" (added since last render)
  const newIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (items.length > prevCountRef.current) {
      // New items are at the front (index 0..diff-1)
      const diff = items.length - prevCountRef.current;
      const added = new Set(items.slice(0, diff).map((n) => n.id));
      newIdsRef.current = added;
      // Clear "new" flag after animation
      const t = setTimeout(() => { newIdsRef.current = new Set(); }, 2000);
      return () => clearTimeout(t);
    }
    prevCountRef.current = items.length;
  }, [items]);

  // Auto-scroll to top when new items arrive (newest first)
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevCountRef.current = items.length;
  }, [items.length, autoScroll]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIdx < 0 || !containerRef.current) return;
    const rows = containerRef.current.querySelectorAll("[role=row]");
    rows[selectedIdx]?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setAutoScroll(containerRef.current.scrollTop < 40);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center px-2 py-1 bg-bb-dark border-b border-bb-border text-[10px] text-bb-muted">
        <span>NEWS FEED — {items.length} ITEMS</span>
        <span>{autoScroll ? "▲ LIVE" : "⏸ PAUSED"} | ↑↓ NAVIGATE | ENTER SELECT | HOME/END JUMP</span>
      </div>
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0" role="grid">
        {items.map((item) => (
          <NewsRow
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            isNew={newIdsRef.current.has(item.id)}
            onSelect={() => onSelect(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

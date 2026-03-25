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
        isSelected ? "bg-bb-orange/20 text-bb-bright" : isNew ? "flash-new" : "hover:bg-bb-dark",
        item.urgency === "FLASH" ? "text-bb-red font-bold" : item.urgency === "URGENT" ? "text-bb-amber" : "",
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
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevLenRef = useRef(items.length);
  const selectedIdx = items.findIndex((n) => n.id === selectedId);

  // Track new items with state so it triggers re-render
  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = items.length;
    if (items.length <= prev) return;

    const diff = items.length - prev;
    const added = new Set(items.slice(0, diff).map((n) => n.id));
    setNewIds(added);

    const t = setTimeout(() => setNewIds(new Set()), 2000);
    return () => clearTimeout(t);
  }, [items.length, items]);

  // Auto-scroll to top
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [items.length, autoScroll]);

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
            isNew={newIds.has(item.id)}
            onSelect={() => onSelect(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

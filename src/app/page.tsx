"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { generateNewsItem, generateInitialNews, type NewsItem } from "@/lib/news-data";
import { CATEGORY_FILTERS, INITIAL_NEWS_COUNT, NEWS_INTERVAL } from "@/lib/constants";
import SearchBar from "@/components/SearchBar";
import NewsFeed from "@/components/NewsFeed";
import NewsDetail from "@/components/NewsDetail";
import StatusBar from "@/components/StatusBar";

type Category = NewsItem["category"] | "ALL";

export default function Terminal() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("ALL");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNews(generateInitialNews(INITIAL_NEWS_COUNT));
  }, []);

  // Incoming news — prepend so newest is at top
  useEffect(() => {
    const id = setInterval(() => {
      setNews((prev) => [generateNewsItem(), ...prev]);
    }, NEWS_INTERVAL[0] + Math.random() * (NEWS_INTERVAL[1] - NEWS_INTERVAL[0]));
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let items = news;
    if (category !== "ALL") items = items.filter((n) => n.category === category);
    if (search) {
      const q = search.toUpperCase();
      items = items.filter((n) => n.headline.toUpperCase().includes(q) || n.source.toUpperCase().includes(q));
    }
    return items;
  }, [news, search, category]);

  const selectedItem = useMemo(() => news.find((n) => n.id === detailId) ?? null, [news, detailId]);

  const navigate = useCallback((dir: number) => {
    setDetailId(null);
    const idx = filtered.findIndex((n) => n.id === selectedId);
    const next = Math.max(0, Math.min(filtered.length - 1, idx + dir));
    if (filtered[next]) setSelectedId(filtered[next].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inSearch = target === searchRef.current;

      if (e.key === "/" && !inSearch) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "Tab") { e.preventDefault(); inSearch ? searchRef.current?.blur() : searchRef.current?.focus(); return; }

      if (e.key === "Escape") {
        if (detailId) { setDetailId(null); return; }
        if (selectedId) { setSelectedId(null); return; }
        if (search) { setSearch(""); return; }
        searchRef.current?.blur();
        return;
      }

      if (e.key === "ArrowDown") { e.preventDefault(); navigate(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); navigate(-1); return; }
      if (e.key === "Home") { e.preventDefault(); if (filtered[0]) setSelectedId(filtered[0].id); return; }
      if (e.key === "End") { e.preventDefault(); if (filtered.length) setSelectedId(filtered[filtered.length - 1].id); return; }
      if (e.key === "Enter" && selectedId) { e.preventDefault(); setDetailId(selectedId); return; }

      if (e.key === "f" && !inSearch) {
        e.preventDefault();
        setCategory((prev) => {
          const values = CATEGORY_FILTERS.map((f) => f.value);
          return values[(values.indexOf(prev) + 1) % values.length];
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedId, detailId, search, filtered]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-bb-orange text-bb-black text-xs font-bold">
        <span>BLOOMBERG NEWS</span>
        <div className="flex gap-3">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategory(f.value)}
              tabIndex={-1}
              className={`px-1 ${category === f.value ? "bg-bb-black text-bb-orange" : "hover:underline"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <SearchBar ref={searchRef} value={search} onChange={setSearch} resultCount={filtered.length} totalCount={news.length} />

      <div className="flex flex-1 min-h-0">
        <div className={`flex flex-col min-h-0 ${detailId ? "w-1/2 border-r border-bb-border" : "w-full"}`}>
          <NewsFeed items={filtered} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setDetailId(id); }} />
        </div>
        {detailId && (
          <div className="w-1/2 bg-bb-panel">
            <NewsDetail item={selectedItem} />
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  );
}

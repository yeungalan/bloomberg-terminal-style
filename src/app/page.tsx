"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { generateNewsItem, generateInitialNews, type NewsItem } from "@/lib/news-data";
import SearchBar from "@/components/SearchBar";
import NewsFeed from "@/components/NewsFeed";
import NewsDetail from "@/components/NewsDetail";
import StatusBar from "@/components/StatusBar";

type Category = NewsItem["category"] | "ALL";
const CATEGORIES: Category[] = ["ALL", "GOVT", "CORP", "ECON", "MKTG", "CMDTY", "FX", "TECH"];

export default function Terminal() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("ALL");
  const searchRef = useRef<HTMLInputElement>(null);

  // Initialize news
  useEffect(() => {
    setNews(generateInitialNews(30));
  }, []);

  // Incoming news ticker
  useEffect(() => {
    const id = setInterval(() => {
      setNews((prev) => [...prev, generateNewsItem()]);
    }, 2000 + Math.random() * 3000);
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

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inSearch = target === searchRef.current;

      // "/" focuses search from anywhere
      if (e.key === "/" && !inSearch) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Tab toggles between search and feed
      if (e.key === "Tab") {
        e.preventDefault();
        if (inSearch) searchRef.current?.blur();
        else searchRef.current?.focus();
        return;
      }

      // Escape: close detail → clear selection → clear search
      if (e.key === "Escape") {
        if (detailId) { setDetailId(null); return; }
        if (selectedId) { setSelectedId(null); return; }
        if (search) { setSearch(""); return; }
        searchRef.current?.blur();
        return;
      }

      // Arrow navigation (works even when search is focused)
      if (e.key === "ArrowDown") { e.preventDefault(); navigate(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); navigate(-1); return; }

      // Home/End
      if (e.key === "Home") { e.preventDefault(); if (filtered[0]) setSelectedId(filtered[0].id); return; }
      if (e.key === "End") { e.preventDefault(); if (filtered.length) setSelectedId(filtered[filtered.length - 1].id); return; }

      // Enter opens detail
      if (e.key === "Enter" && selectedId) { e.preventDefault(); setDetailId(selectedId); return; }

      // F key cycles category filter (only when not in search)
      if (e.key === "f" && !inSearch) {
        e.preventDefault();
        setCategory((prev) => {
          const idx = CATEGORIES.indexOf(prev);
          return CATEGORIES[(idx + 1) % CATEGORIES.length];
        });
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedId, detailId, search, filtered]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-bb-orange text-bb-black text-xs font-bold">
        <span>BLOOMBERG NEWS</span>
        <div className="flex gap-3">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              tabIndex={-1}
              className={`px-1 ${category === c ? "bg-bb-black text-bb-orange" : "hover:underline"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <SearchBar ref={searchRef} value={search} onChange={setSearch} resultCount={filtered.length} totalCount={news.length} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* News list */}
        <div className={`flex flex-col min-h-0 ${detailId ? "w-1/2 border-r border-bb-border" : "w-full"}`}>
          <NewsFeed items={filtered} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setDetailId(id); }} />
        </div>

        {/* Detail panel */}
        {detailId && (
          <div className="w-1/2 bg-bb-panel">
            <NewsDetail item={selectedItem} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}

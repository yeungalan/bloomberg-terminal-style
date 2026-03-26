"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { NewsItem } from "@/lib/news-data";
import { CATEGORY_FILTERS, REGION_FILTERS } from "@/lib/constants";
import SearchBar from "@/components/SearchBar";
import NewsFeed from "@/components/NewsFeed";
import NewsDetail from "@/components/NewsDetail";
import StatusBar from "@/components/StatusBar";

type Category = NewsItem["category"] | "ALL";
type Region = NewsItem["region"] | "ALL";

function useWebSocket() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${proto}//${location.host}/ws`);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onmessage = (e) => {
        const items: NewsItem[] = JSON.parse(e.data);
        setNews((prev) => [...items, ...prev].slice(0, 500));
      };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { news, connected };
}

function useNewIds(news: NewsItem[]) {
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(news.map((n) => n.id));
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevIdsRef.current = currentIds;
      return;
    }
    const added = new Set<string>();
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) added.add(id);
    }
    prevIdsRef.current = currentIds;
    if (added.size === 0) return;
    setNewIds(added);
    const t = setTimeout(() => setNewIds(new Set()), 2000);
    return () => clearTimeout(t);
  }, [news]);

  return newIds;
}

export default function Terminal() {
  const { news, connected } = useWebSocket();
  const newIds = useNewIds(news);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("ALL");
  const [region, setRegion] = useState<Region>("ALL");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let items = news;
    if (category !== "ALL") items = items.filter((n) => n.category === category);
    if (region !== "ALL") items = items.filter((n) => n.region === region);
    if (search) {
      const q = search.toUpperCase();
      items = items.filter((n) => n.headline.toUpperCase().includes(q) || n.source.toUpperCase().includes(q));
    }
    return items;
  }, [news, search, category, region]);

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
      if (e.key === "Enter" && selectedId) { e.preventDefault(); if (detailId) { setDetailId(null); } else { setDetailId(selectedId); } return; }

      if (!inSearch) {
        if (e.key === "o" && selectedId) {
          e.preventDefault();
          const item = news.find((n) => n.id === selectedId);
          if (item?.link) window.open(item.link, "_blank", "noopener");
          return;
        }
        if (e.key === "f") {
          e.preventDefault();
          setCategory((prev) => {
            const values = CATEGORY_FILTERS.map((f) => f.value);
            return values[(values.indexOf(prev) + 1) % values.length];
          });
        }
        if (e.key === "r") {
          e.preventDefault();
          setRegion((prev) => {
            const values = REGION_FILTERS.map((f) => f.value);
            return values[(values.indexOf(prev) + 1) % values.length];
          });
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedId, detailId, search, filtered, news]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-bb-orange text-bb-black text-xs font-bold">
        <span>BLOOMBERG NEWS</span>
        <div className="flex gap-3">
          {REGION_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setRegion(f.value)} tabIndex={-1}
              className={`px-1 ${region === f.value ? "bg-bb-black text-bb-orange" : "hover:underline"}`}>
              {f.label}
            </button>
          ))}
          <span className="text-bb-black/40">|</span>
          {CATEGORY_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setCategory(f.value)} tabIndex={-1}
              className={`px-1 ${category === f.value ? "bg-bb-black text-bb-orange" : "hover:underline"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <SearchBar ref={searchRef} value={search} onChange={setSearch} resultCount={filtered.length} totalCount={news.length} />

      <div className="flex flex-1 min-h-0">
        <div className={`flex flex-col min-h-0 ${detailId ? "w-1/2 border-r border-bb-border" : "w-full"}`}>
          <NewsFeed items={filtered} selectedId={selectedId} newIds={newIds} onSelect={(id) => { setSelectedId(id); setDetailId(id); }} />
        </div>
        {detailId && (
          <div className="w-1/2 bg-bb-panel">
            <NewsDetail item={selectedItem} />
          </div>
        )}
      </div>

      <StatusBar connected={connected} />
    </div>
  );
}

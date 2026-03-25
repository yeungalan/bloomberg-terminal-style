"use client";

import { forwardRef } from "react";

const SearchBar = forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
  totalCount: number;
}>(({ value, onChange, resultCount, totalCount }, ref) => (
  <div className="flex items-center gap-2 px-2 py-1.5 bg-bb-dark border-b border-bb-border">
    <span className="text-bb-orange font-bold text-xs">N</span>
    <span className="text-bb-amber text-xs">NEWS&gt;</span>
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="SEARCH HEADLINES..."
      className="flex-1 bg-transparent text-bb-bright text-xs outline-none placeholder:text-bb-muted caret-bb-orange"
      spellCheck={false}
      autoComplete="off"
    />
    <span className="text-bb-muted text-[10px]">{resultCount}/{totalCount}</span>
    <span className="text-bb-green text-[10px] cursor-blink">█</span>
  </div>
));

SearchBar.displayName = "SearchBar";
export default SearchBar;

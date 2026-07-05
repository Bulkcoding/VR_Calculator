"use client";

import { useState, useEffect, useRef } from "react";

interface SearchResult {
  ticker: string;
  name: string;
  market: string;
}

interface WatchlistAddModalProps {
  onClose: () => void;
  onAdded: () => void;
  existingTickers?: string[];
}

export default function WatchlistAddModal({ onClose, onAdded, existingTickers = [] }: WatchlistAddModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(existingTickers));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const add = async (r: SearchResult) => {
    setAdding(r.ticker);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: r.ticker, name: r.name, market: r.market }),
    });
    setAdding(null);
    if (res.ok) {
      setAdded((prev) => new Set(prev).add(r.ticker));
      onAdded();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">관심종목 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목명 또는 티커 검색 (예: 삼성전자, AAPL)"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">검색중…</span>}
          </div>

          {query.trim() && (
            <div className="mt-3 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden max-h-72 overflow-y-auto">
              {results.length === 0 && searched && !searching ? (
                <p className="text-sm text-gray-400 text-center py-6">검색 결과가 없습니다.</p>
              ) : (
                results.map((r) => {
                  const already = added.has(r.ticker);
                  return (
                    <div key={r.ticker} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition">
                      <div className="theme-gradient-badge w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0">
                        {r.ticker.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.ticker}{r.market ? ` · ${r.market}` : ""}</div>
                      </div>
                      <button
                        onClick={() => add(r)}
                        disabled={already || adding === r.ticker}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        {already ? "추가됨" : adding === r.ticker ? "추가중…" : "+ 추가"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

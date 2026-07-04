"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import StockChart from "@/components/StockChart";

interface SearchResult {
  ticker: string;
  name: string;
  market: string;
}

interface WatchItem {
  id: string;
  ticker: string;
  name: string;
  market: string | null;
  currency: string;
  currentPrice: number | null;
}

function sym(currency: string) {
  return currency === "USD" ? "$" : "₩";
}

export default function WatchlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/watchlist");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated") fetchItems();
  }, [status, fetchItems, router]);

  // 검색어 입력 → 디바운스 후 다중 결과 조회
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

  const watchedTickers = new Set(items.map((i) => i.ticker));

  const addItem = async (r: SearchResult) => {
    setAdding(r.ticker);
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: r.ticker, name: r.name, market: r.market }),
    });
    setAdding(null);
    setQuery("");
    setResults([]);
    setSearched(false);
    fetchItems();
  };

  const removeItem = async (ticker: string) => {
    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
    if (expanded === ticker) setExpanded(null);
    fetchItems();
  };

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  }

  return (
    <DashboardShell title="관심종목">
      <div className="space-y-6">
        <p className="text-sm text-gray-500 -mt-2">
          종목을 검색해 관심목록에 추가하면 Yahoo Finance 시세와 차트를 확인할 수 있습니다.
        </p>

        {/* 검색 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목명 또는 티커 검색 (예: 삼성전자, AAPL)"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">검색중…</span>
            )}
          </div>

          {/* 검색 결과 (여러 개 중 선택) */}
          {query.trim() && (
            <div className="mt-3 border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {results.length === 0 && searched && !searching ? (
                <p className="text-sm text-gray-400 text-center py-6">검색 결과가 없습니다.</p>
              ) : (
                results.map((r) => {
                  const already = watchedTickers.has(r.ticker);
                  return (
                    <div key={r.ticker} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 drop-shadow-sm">
                        {r.ticker.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.ticker}{r.market ? ` · ${r.market}` : ""}</div>
                      </div>
                      <button
                        onClick={() => addItem(r)}
                        disabled={already || adding === r.ticker}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-50 text-blue-600 hover:bg-blue-100 enabled:hover:bg-blue-100"
                      >
                        {already ? "추가됨" : adding === r.ticker ? "추가중…" : "+ 관심추가"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 관심목록 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">내 관심종목 {items.length > 0 && <span className="text-gray-400 font-normal">({items.length})</span>}</h2>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              관심종목이 없습니다.<br />위에서 종목을 검색해 추가해보세요.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 -mx-5">
              {items.map((it) => {
                const isOpen = expanded === it.ticker;
                const unit = sym(it.currency);
                return (
                  <div key={it.id}>
                    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                        {it.ticker.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{it.name}</div>
                        <div className="text-xs text-gray-400">{it.ticker}{it.market ? ` · ${it.market}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {it.currentPrice != null ? `${unit}${it.currentPrice.toLocaleString()}` : "—"}
                        </div>
                        <div className="text-[11px] text-gray-400">{it.currentPrice != null ? "현재가" : "미조회"}</div>
                      </div>
                      <button
                        onClick={() => setExpanded(isOpen ? null : it.ticker)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                        title="차트 보기"
                      >
                        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeItem(it.ticker)}
                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                        title="관심 해제"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1">
                        <StockChart
                          ticker={it.ticker}
                          currencySymbol={unit}
                          height={160}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

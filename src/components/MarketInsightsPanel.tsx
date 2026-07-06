"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IndustryRanking } from "@/lib/industryApi";
import type { ThemeRanking } from "@/lib/themeApi";


interface RankingResponse<T> {
  updatedAt: string;
  industries?: T[];
  themes?: T[];
  error?: string;
}

function ChangeRate({ value, compact = false }: { value: number; compact?: boolean }) {
  const positive = value >= 0;
  return (
    <span className={`${compact ? "text-xs" : "text-sm"} font-bold tabular-nums ${positive ? "text-red-500" : "text-blue-600"}`}>
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function Price({ value }: { value: number }) {
  return <span className="text-xs font-medium text-gray-700 tabular-nums">{value.toLocaleString()}원</span>;
}

function SectionHeader({ title, description, updatedAt }: { title: string; description: string; updatedAt?: string }) {
  const time = updatedAt
    ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(updatedAt))
    : null;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        {time && <span>{time} 기준</span>}
        <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">10분 캐시</span>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      <button onClick={onRetry} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700">
        다시 불러오기
      </button>
    </div>
  );
}

export default function MarketInsightsPanel() {
  const [industries, setIndustries] = useState<IndustryRanking[]>([]);
  const [themes, setThemes] = useState<ThemeRanking[]>([]);
  const [industryUpdatedAt, setIndustryUpdatedAt] = useState<string>();
  const [themeUpdatedAt, setThemeUpdatedAt] = useState<string>();
  const [industryError, setIndustryError] = useState("");
  const [themeError, setThemeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRankings() {
      setLoading(true);
      setIndustryError("");
      setThemeError("");

      const [industryResult, themeResult] = await Promise.allSettled([
        fetch("/api/industry", { signal: controller.signal }).then(async (response) => {
          const data = await response.json() as RankingResponse<IndustryRanking>;
          if (!response.ok) throw new Error(data.error || "산업 데이터를 불러오지 못했습니다.");
          return data;
        }),
        fetch("/api/themes", { signal: controller.signal }).then(async (response) => {
          const data = await response.json() as RankingResponse<ThemeRanking>;
          if (!response.ok) throw new Error(data.error || "테마 데이터를 불러오지 못했습니다.");
          return data;
        }),
      ]);

      if (controller.signal.aborted) return;

      if (industryResult.status === "fulfilled") {
        setIndustries(industryResult.value.industries ?? []);
        setIndustryUpdatedAt(industryResult.value.updatedAt);
      } else {
        setIndustryError(industryResult.reason instanceof Error ? industryResult.reason.message : "산업 데이터를 불러오지 못했습니다.");
      }

      if (themeResult.status === "fulfilled") {
        setThemes(themeResult.value.themes ?? []);
        setThemeUpdatedAt(themeResult.value.updatedAt);
      } else {
        setThemeError(themeResult.reason instanceof Error ? themeResult.reason.message : "테마 데이터를 불러오지 못했습니다.");
      }

      setLoading(false);
    }

    loadRankings();
    return () => controller.abort();
  }, [requestVersion]);

  const retry = () => setRequestVersion((version) => version + 1);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <SectionHeader title="지금 뜨는 산업" description="당일 상승률 상위 업종과 대표 종목" updatedAt={industryUpdatedAt} />
        {loading ? <LoadingRows /> : industryError ? <ErrorState message={industryError} onRetry={retry} /> : (
          <div className="grid gap-px bg-gray-100 md:grid-cols-2 xl:grid-cols-3">
            {industries.map((industry, index) => (
              <article key={industry.id} className="bg-white p-5 transition-colors hover:bg-emerald-50/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">{index + 1}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{industry.name}</h3>
                      <p className="mt-0.5 text-[11px] text-gray-400">{industry.stockCount}개 중 {industry.upCount}개 상승</p>
                    </div>
                  </div>
                  <ChangeRate value={industry.changeRate} />
                </div>
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                  {industry.representativeStocks.map((stock) => (
                    <div key={stock.code} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{stock.name}</span>
                      <Price value={stock.currentPrice} />
                      <ChangeRate value={stock.changeRate} compact />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <SectionHeader title="테마별 주식 순위" description="당일 상승률 상위 테마와 주도 종목" updatedAt={themeUpdatedAt} />
        {loading ? <LoadingRows /> : themeError ? <ErrorState message={themeError} onRetry={retry} /> : (
          <div className="divide-y divide-gray-100">
            {themes.map((theme, index) => (
              <Link
                key={theme.id}
                href={`/themes/${theme.id}`}
                className="grid gap-3 px-5 py-4 transition-colors hover:bg-sky-50/40 focus:bg-sky-50/60 focus:outline-none lg:grid-cols-[minmax(0,1.2fr)_110px_110px_minmax(0,2fr)] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-700">{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{theme.name}</h3>
                    <p className="mt-0.5 text-[11px] text-gray-400">상승 {theme.upCount} · 보합 {theme.flatCount} · 하락 {theme.downCount}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between lg:block lg:text-right">
                  <span className="text-[11px] text-gray-400 lg:block">오늘</span>
                  <ChangeRate value={theme.changeRate} />
                </div>
                <div className="flex items-center justify-between lg:block lg:text-right">
                  <span className="text-[11px] text-gray-400 lg:block">최근 3일</span>
                  <ChangeRate value={theme.recentThreeDayRate} compact />
                </div>
                <div className="grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  {theme.stocks.map((stock) => (
                    <div key={stock.code} className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
                      <div className="truncate text-xs font-medium text-gray-700">{stock.name}</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Price value={stock.currentPrice} />
                        <ChangeRate value={stock.changeRate} compact />
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";

import DashboardShell from "@/components/DashboardShell";
import type { ThemeRanking, ThemeSummary } from "@/lib/themeApi";

function RateText({ value, compact = false }: { value: number; compact?: boolean }) {
  const positive = value >= 0;
  return (
    <span className={`${compact ? "text-sm" : "text-lg"} font-bold tabular-nums ${positive ? "text-red-500" : "text-blue-600"}`}>
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function formatPrice(value: number) {
  return `${value.toLocaleString()}원`;
}

interface ThemeExplorerProps {
  themes: ThemeSummary[];
  selectedTheme: ThemeRanking | null;
  updatedAt: string;
}

export default function ThemeExplorer({ themes, selectedTheme, updatedAt }: ThemeExplorerProps) {
  const time = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(updatedAt));

  return (
    <DashboardShell title="테마별 주식" hideBrand>
      <div className="space-y-6">
        <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Theme Explorer</p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">테마별 주식 흐름을 한 화면에서 확인</h1>
              <p className="mt-2 text-sm text-gray-500">메인 화면의 테마 순위와 연결되어 있고, 왼쪽 메뉴에서 다른 테마로 바로 이동할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span>{time} 기준</span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">10분 캐시</span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <div className="border-b border-gray-100 px-3 pb-3 pt-2">
              <h2 className="text-sm font-semibold text-gray-900">테마 메뉴</h2>
              <p className="mt-1 text-xs text-gray-400">상승률 상위 테마를 빠르게 이동</p>
            </div>
            <div className="mt-3 space-y-1">
              {themes.map((theme, index) => {
                const active = theme.id === selectedTheme?.id;
                return (
                  <Link
                    key={theme.id}
                    href={`/themes/${theme.id}`}
                    className={`block rounded-xl px-3 py-3 transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{theme.name}</div>
                        <div className="mt-0.5 text-[11px] text-gray-400">상승 {theme.upCount} · 보합 {theme.flatCount} · 하락 {theme.downCount}</div>
                      </div>
                      <RateText value={theme.changeRate} compact />
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            {!selectedTheme ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">표시할 테마 데이터가 없습니다.</div>
            ) : (
              <>
                <div className="border-b border-gray-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Selected Theme</p>
                      <h2 className="mt-2 text-2xl font-bold text-gray-900">{selectedTheme.name}</h2>
                      <p className="mt-2 text-sm text-gray-500">총 {selectedTheme.stocks.length}개 종목을 테마 기준으로 조회했습니다.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] text-gray-400">오늘</div>
                        <div className="mt-1"><RateText value={selectedTheme.changeRate} /></div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] text-gray-400">최근 3일</div>
                        <div className="mt-1"><RateText value={selectedTheme.recentThreeDayRate} /></div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] text-gray-400">상승 종목</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">{selectedTheme.upCount}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] text-gray-400">보합 / 하락</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">{selectedTheme.flatCount} / {selectedTheme.downCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTheme.stocks.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-gray-500">이 테마의 종목 데이터를 아직 불러오지 못했습니다.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedTheme.stocks.map((stock, index) => (
                      <div key={stock.code} className="grid gap-3 px-6 py-4 transition-colors hover:bg-gray-50 md:grid-cols-[64px_minmax(0,1fr)_140px_120px] md:items-center">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sm font-bold text-sky-700">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{stock.name}</div>
                          <div className="mt-1 text-xs text-gray-400">{stock.code}</div>
                        </div>
                        <div className="text-sm font-semibold text-gray-700 tabular-nums md:text-right">{formatPrice(stock.currentPrice)}</div>
                        <div className="md:text-right">
                          <RateText value={stock.changeRate} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

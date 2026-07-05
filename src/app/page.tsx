"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { getBrokerLogoPath } from "@/lib/brokerLogos";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import RingProgress from "@/components/RingProgress";
import Sparkline from "@/components/Sparkline";
import ActivityItem from "@/components/ActivityItem";
import ContextMenu from "@/components/ContextMenu";
import EditHoldingForm from "@/components/EditHoldingForm";
import BrokerConnectionModal from "@/components/BrokerConnectionModal";
import WatchlistAddModal from "@/components/WatchlistAddModal";
import MarketStatusBadge from "@/components/MarketStatusBadge";
import MarketInsightsPanel from "@/components/MarketInsightsPanel";
import { CurrencyToggle, convertAmount, formatMoney, type DisplayCurrency } from "@/components/CurrencyToggle";


interface Holding {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  currency: string;
  broker: string;
}

interface WatchItem {
  id: string;
  ticker: string;
  name: string;
  market: string | null;
  currency: string;
  currentPrice: number | null;
}

interface ChartInfo {
  changePct: number | null;
  spark: number[];
}

function LoginView({ onRegister }: { onRegister: () => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    if (res?.error) setError("이메일 또는 비밀번호가 올바르지 않습니다");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-900 text-lg leading-tight">VR</div>
            <div className="text-[10px] tracking-widest text-gray-400 font-semibold">REBALANCING</div>
          </div>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <input type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
            로그인
          </button>
          <p className="text-sm text-gray-500 text-center">
            계정이 없으신가요?{" "}
            <button type="button" onClick={onRegister} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer font-medium">
              회원가입
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function RegisterView({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) setDone(true);
    else { const d = await res.json(); setError(d.error || "회원가입 실패"); }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-green-600 font-semibold">회원가입 완료!</p>
          <button onClick={onBack} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">회원가입</h1>
        <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <input type="text" placeholder="이름 (선택)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required minLength={4} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
            가입하기
          </button>
          <p className="text-sm text-gray-500 text-center">
            이미 계정이 있으신가요?{" "}
            <button type="button" onClick={onBack} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer font-medium">
              로그인
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function CardShell({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "", avgPrice: "", currency: "KRW", broker: "manual" });
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; holding: Holding } | null>(null);
  const [watchMenu, setWatchMenu] = useState<{ x: number; y: number; watchItem: WatchItem } | null>(null);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [brokerModal, setBrokerModal] = useState<{ open: boolean; broker: string }>({
    open: false,
    broker: "kis",
  });
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [showWatchAdd, setShowWatchAdd] = useState(false);
  const [holdingSparks, setHoldingSparks] = useState<Record<string, number[]>>({});
  const [watchCharts, setWatchCharts] = useState<Record<string, ChartInfo>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("KRW");
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // 표시 통화 선택을 localStorage에 보존
  useEffect(() => {
    const saved = localStorage.getItem("displayCurrency");
    if (saved === "USD" || saved === "KRW") setDisplayCurrency(saved);
  }, []);
  const changeDisplayCurrency = (v: DisplayCurrency) => {
    setDisplayCurrency(v);
    localStorage.setItem("displayCurrency", v);
  };

const formatImportedBrokerNames = (brokers: string[]) => {
  const labels: Record<string, string> = {
    kis: "한국투자증권",
    toss: "토스증권",
  };
  return brokers.map((broker) => labels[broker] || broker).join(", ");
};

const formatHoldingBroker = (broker: string) => {
  const labels: Record<string, string> = {
    manual: "수동",
    kis: "한국투자증권",
    toss: "토스증권",
    other: "기타 증권사",
    samsung: "삼성증권",
    kb: "KB증권",
    mirae: "미래에셋증권",
    nh: "NH투자증권",
    shinhan: "신한투자증권",
    hana: "하나증권",
    daishin: "대신증권",
    yuanta: "유안타증권",
    eugene: "유진투자증권",

  };
  return labels[broker] || broker.toUpperCase();
};


  const fetchFx = useCallback(async () => {
    const res = await fetch("/api/fx");
    if (res.ok) { const d = await res.json(); setFxRate(d.usdkrw ?? null); }
  }, []);

  const fetchHoldings = useCallback(async () => {
    const res = await fetch("/api/holdings");
    if (res.ok) setHoldings(await res.json());
  }, []);

  const fetchWatchlist = useCallback(async () => {
    const res = await fetch("/api/watchlist");
    if (res.ok) setWatchlist(await res.json());
  }, []);

  // 차트(스파크라인)는 별도 60초 주기로 갱신
  const fetchHoldingSparks = useCallback(async () => {
    const res = await fetch("/api/holdings/sparklines");
    if (res.ok) setHoldingSparks(await res.json());
  }, []);

  const fetchWatchCharts = useCallback(async () => {
    const res = await fetch("/api/watchlist/charts");
    if (res.ok) setWatchCharts(await res.json());
  }, []);

  const removeWatch = async (ticker: string) => {
    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
    fetchWatchlist();
  };

  // 관심종목 순서 변경 (Pointer Events: 데스크톱 마우스 + 모바일 터치 동시 지원)
  const watchlistRef = useRef<WatchItem[]>([]);
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  const dragActiveRef = useRef(false);
  const dragIdxRef = useRef(-1);

  const reorderWatch = (from: number, to: number) => {
    setWatchlist((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const persistWatchOrder = async () => {
    const tickers = watchlistRef.current.map((w) => w.ticker);
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
    });
  };

  const startWatchDrag = (index: number) => {
    dragActiveRef.current = true;
    dragIdxRef.current = index;
    setDragIndex(index);
  };

  const moveWatchDrag = (clientX: number, clientY: number) => {
    if (!dragActiveRef.current) return;
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest("[data-watch-index]") as HTMLElement | null;
    if (!row) return;
    const over = parseInt(row.dataset.watchIndex || "", 10);
    const from = dragIdxRef.current;
    if (Number.isNaN(over) || over === from) return;
    reorderWatch(from, over);
    dragIdxRef.current = over;
    setDragIndex(over);
  };

  const endWatchDrag = () => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    dragIdxRef.current = -1;
    setDragIndex(null);
    persistWatchOrder();
  };

  const refreshPrices = useCallback(async () => {
    await fetch("/api/holdings/refresh", { method: "POST" });
    fetchHoldings();
  }, [fetchHoldings]);

  const syncAllLinkedBrokers = async () => {
    setSyncingAll(true);
    setSyncResult(null);

    const res = await fetch("/api/brokers/import-all", { method: "POST" });
    const data = await res.json().catch(() => null);

    if (res.ok) {
      const importedBrokers = Array.isArray(data?.importedBrokers) ? data.importedBrokers : [];
      const failedCount = Array.isArray(data?.results)
        ? data.results.filter((item: { ok?: boolean }) => !item.ok).length
        : 0;
      const importedLabel = importedBrokers.length > 0 ? formatImportedBrokerNames(importedBrokers) : "연동 계좌";
      const failureLabel = failedCount > 0 ? ` · ${failedCount}개 증권사 실패` : "";

      setSyncResult({
        ok: data?.ok !== false,
        msg: `${importedLabel} 묶어오기 완료 · ${data?.mergedCount ?? 0}종목 반영 · ${data?.added ?? 0}개 추가, ${data?.updated ?? 0}개 갱신${failureLabel}`,
      });
      await fetchHoldings();
    } else {
      const unsupported = Array.isArray(data?.unsupportedBrokers) && data.unsupportedBrokers.length > 0
        ? ` (미지원: ${data.unsupportedBrokers.join(", ")})`
        : "";
      setSyncResult({
        ok: false,
        msg: `묶어오기 실패: ${data?.error || "연동된 지원 증권사가 없습니다."}${unsupported}`,
      });
    }

    setSyncingAll(false);
  };

  useEffect(() => {
    if (status === "authenticated") {
      // 최초 1회: 현재가 + 차트 + 환율 로드
      refreshPrices();
      fetchWatchlist();
      fetchHoldingSparks();
      fetchWatchCharts();
      fetchFx();
      // 현재가/수익률/환율: 30초 주기
      const priceInterval = setInterval(() => {
        refreshPrices();
        fetchWatchlist();
        fetchFx();
      }, 30000);
      // 차트(스파크라인): 60초 주기
      const chartInterval = setInterval(() => {
        fetchHoldingSparks();
        fetchWatchCharts();
      }, 60000);
      // 증권사 연동 자동 묶어오기: 페이지 열자마자 1회 + 이후 30분 주기
      fetch("/api/brokers/import-all", { method: "POST" })
        .then((res) => res.json().catch(() => null))
        .then((data) => { if (data?.ok) fetchHoldings(); })
        .catch(() => {});
      const brokerSyncInterval = setInterval(() => {
        fetch("/api/brokers/import-all", { method: "POST" })
          .then((res) => res.json().catch(() => null))
          .then((data) => { if (data?.ok) fetchHoldings(); })
          .catch(() => {});
      }, 1800000);
      return () => {
        clearInterval(priceInterval);
        clearInterval(chartInterval);
        clearInterval(brokerSyncInterval);
      };
    }
  }, [status, refreshPrices, fetchWatchlist, fetchHoldingSparks, fetchWatchCharts, fetchFx, fetchHoldings]);

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, quantity: parseFloat(form.quantity),
        avgPrice: parseFloat(form.avgPrice), currency: form.currency, broker: form.broker,
      }),
    });
    setForm({ name: "", quantity: "", avgPrice: "", currency: "KRW", broker: "manual" });
    setShowForm(false);
    setLoading(false);
    fetchHoldings();
  };



  const deleteHolding = async (id: string) => {
    await fetch(`/api/holdings?id=${id}`, { method: "DELETE" });
    fetchHoldings();
  };

  const handleContextMenu = (e: React.MouseEvent, holding: Holding) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, holding });
  };

  const handleWatchContextMenu = (e: React.MouseEvent, item: WatchItem) => {
    e.preventDefault();
    setWatchMenu({ x: e.clientX, y: e.clientY, watchItem: item });
  };

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  if (status === "unauthenticated") {
    if (authView === "register") return <RegisterView onBack={() => setAuthView("login")} />;
    return <LoginView onRegister={() => setAuthView("register")} />;
  }

  // 표시 통화로 환산하여 합산 (환율 없으면 교차통화 항목은 제외)
  const hasPriceHolding = holdings.filter((h) => h.currentPrice !== null);
  const totalAsset = hasPriceHolding.reduce((s, h) => {
    const v = convertAmount(h.currentPrice! * h.quantity, h.currency, displayCurrency, fxRate);
    return v == null ? s : s + v;
  }, 0);
  const totalCost = holdings.reduce((s, h) => {
    const v = convertAmount(h.avgPrice * h.quantity, h.currency, displayCurrency, fxRate);
    return v == null ? s : s + v;
  }, 0);
  const totalGain = totalAsset - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  // 실현 수익은 매도 기록/외부 API가 있어야 계산 가능 → 현재 미지원이라 비활성화 (추후 복구)
  // const realized = 0;

  const rebalancePct = holdings.length > 0 ? 78 : 0;
  const nextRebalance = "2026.06.21";

  return (
    <DashboardShell
      title="ReValue"
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBrokerModal({ open: true, broker: "kis" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            🏦 증권사 연동
          </button>
        </div>
      }
    >
      <div className="mb-4">
        <MarketStatusBadge />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">안녕하세요, {session?.user?.name || "원석"}님 👋</h2>
        <p className="text-sm text-gray-500 mt-1">오늘도 현명한 투자를 응원합니다.</p>
      </div>

      {syncResult && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${syncResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {syncResult.msg}
        </div>
      )}

      {showForm && (
        <CardShell className="mb-6">
          <form onSubmit={addHolding} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input placeholder="종목명 (예: 삼성전자)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              required className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="보유수량" type="number" step="any" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })} required
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-1">
              <input placeholder="평균단가" type="number" step="any" value={form.avgPrice}
                onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} required
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="KRW">원</option>
                <option value="USD">$</option>
              </select>
            </div>
            <div className="flex gap-1">
              <select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })}
                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="manual">수동입력</option>
                <option value="kis">한국투자증권</option>
                <option value="kiwoom">키움증권</option>
                <option value="toss">토스증권</option>
                <option value="kakao">카카오페이증권</option>
                <option value="samsung">삼성증권</option>
                <option value="mirae">미래에셋증권</option>
                <option value="daishin">대신증권</option>
                <option value="nh">NH투자증권</option>
                <option value="shinhan">신한투자증권</option>
                <option value="hana">하나증권</option>
                <option value="kb">KB증권</option>
                <option value="yuanta">유안타증권</option>
                <option value="eugene">유진투자증권</option>
                <option value="ls">LS증권</option>
              </select>

              <button type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? "..." : "추가"}
              </button>
            </div>
          </form>
        </CardShell>
      )}

      {/* 실현 수익 카드 비활성화로 그리드를 3열 → 2열로 조정 (복구 시 sm:grid-cols-3 으로 되돌리기) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="총 자산"
          value={formatMoney(totalAsset, displayCurrency)}
          change={`${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}%`}
          changePositive={totalGainPct >= 0}
          subtext="전일 대비"
        />
        <StatCard
          label="총 수익"
          value={formatMoney(Math.abs(totalGain), displayCurrency)}
          change={`${totalGain >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}%`}
          changePositive={totalGain >= 0}
          subtext="누적 수익률"
          accent="blue"
        />
        {/* 실현 수익: 매도 기록/실현손익 API 미지원으로 임시 비활성화 (추후 복구)
        <StatCard
          label="실현 수익"
          unit="₩"
          value={realized.toLocaleString()}
          change="+0.00%"
          changePositive
          subtext="이번 달"
          accent="green"
        />
        */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <CardShell
          title="보유 종목"
          action={
            <div className="flex items-center gap-2">
              <CurrencyToggle value={displayCurrency} onChange={changeDisplayCurrency} />
              <button
                onClick={syncAllLinkedBrokers}
                disabled={syncingAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition"
              >
                {syncingAll ? "묶어오는중..." : "연동계좌 한번에 불러오기"}
              </button>
            </div>
          }
          className="lg:col-span-2"
        >
          {holdings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">보유중인 종목이 없습니다.<br />종목 추가 버튼을 눌러 시작해보세요.</p>
          ) : (
            <div className="-mx-5">
              {/* 컬럼 헤더 */}
              <div className="hidden sm:flex items-center gap-3 px-5 pb-2 text-[11px] font-medium text-gray-400 border-b border-gray-100">
                <div className="w-10 shrink-0" />
                <div className="flex-1 min-w-0">종목</div>
                <div className="w-14 text-right">보유수량</div>
                <div className="w-20 text-right">평균단가</div>
                <div className="w-24 text-right">현재가</div>
                <div className="w-14 text-right">수익률</div>
                <div className="hidden md:block w-20 text-center">차트</div>
                <div className="w-4 shrink-0" />
              </div>
              <div className="divide-y divide-gray-100">
                {holdings.map((h) => {
                  const hasPrice = h.currentPrice !== null;
                  const gainPct = hasPrice ? ((h.currentPrice! - h.avgPrice) / h.avgPrice) * 100 : 0;
                  const positive = gainPct >= 0;
                  const dispAvg = convertAmount(h.avgPrice, h.currency, displayCurrency, fxRate);
                  const dispCur = hasPrice ? convertAmount(h.currentPrice!, h.currency, displayCurrency, fxRate) : null;
                  const spark = holdingSparks[h.id] && holdingSparks[h.id].length > 1 ? holdingSparks[h.id] : [];
                  return (
                    <div
                      key={h.id}
                      onClick={() => router.push(`/holdings/${h.id}`)}
                      onContextMenu={(e) => handleContextMenu(e, h)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition cursor-pointer"
                    >
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-md">
                        {h.ticker.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{h.name}</div>
                        <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                          {(getBrokerLogoPath(h.broker) ? (
                            <Image src={getBrokerLogoPath(h.broker)!} alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-full object-contain inline-block" unoptimized />
                          ) : null)}
                          {h.ticker} · {formatHoldingBroker(h.broker)}
                        </div>
                      </div>
                      <div className="hidden sm:block w-14 text-right text-sm text-gray-700">
                        {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}주
                      </div>
                      <div className="hidden sm:block w-20 text-right text-sm text-gray-700">
                        {formatMoney(dispAvg, displayCurrency)}
                      </div>
                      <div className="w-24 text-right text-sm font-semibold text-gray-900">
                        {formatMoney(dispCur, displayCurrency)}
                      </div>
                      <div className={`w-14 text-right text-xs font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
                        {hasPrice ? `${positive ? "+" : ""}${gainPct.toFixed(2)}%` : "—"}
                      </div>
                      <div className="hidden md:block w-20">
                        {spark.length > 1 ? (
                          <Sparkline points={spark} color={positive ? "#10b981" : "#ef4444"} />
                        ) : (
                          <div className="h-8" />
                        )}
                      </div>
                      <div className="text-gray-300 shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardShell>

        <CardShell title="리밸런싱 현황">
          <div className="flex flex-col items-center text-center">
            <RingProgress value={rebalancePct} label="진행률" sublabel="이번 사이클" />
            <div className="grid grid-cols-2 gap-3 w-full mt-4 pt-4 border-t border-gray-100 text-left">
              <div>
                <div className="text-[11px] text-gray-400">현재 Pool</div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">$2,430.00</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">다음 리밸런싱</div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">{nextRebalance}</div>
              </div>
            </div>
            <button className="w-full mt-4 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
              실시간 보기 →
            </button>
          </div>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <CardShell
        title="관심종목"
        action={
          <div className="flex items-center gap-2">
            <CurrencyToggle value={displayCurrency} onChange={changeDisplayCurrency} />
            <Link href="/watchlist" className="text-xs text-blue-600 hover:underline font-medium">전체보기</Link>
            <button
              onClick={() => setShowWatchAdd(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition"
            >
              + 관심종목 추가
            </button>
          </div>
        }
        className="lg:col-span-2"
      >
        {watchlist.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            관심종목이 없습니다.{" "}
            <button onClick={() => setShowWatchAdd(true)} className="text-blue-600 hover:underline">추가하기</button>
          </p>
        ) : (
          <div className="-mx-5">
            {/* 컬럼 헤더 */}
            <div className="hidden sm:flex items-center gap-3 px-5 pb-2 text-[11px] font-medium text-gray-400 border-b border-gray-100">
              <div className="w-4 shrink-0" />
              <div className="w-10 shrink-0" />
              <div className="flex-1 min-w-0">종목</div>
              <div className="w-24 text-right">현재가</div>
              <div className="w-16 text-right">등락률</div>
              <div className="hidden md:block w-20 text-center">1일 차트</div>
              <div className="w-6 shrink-0" />
              <div className="w-6 shrink-0" />
            </div>
            <div className="divide-y divide-gray-100">
              {watchlist.map((w, i) => {
                const chart = watchCharts[w.ticker];
                const changePct = chart?.changePct ?? null;
                const spark = chart?.spark ?? [];
                const positive = (changePct ?? 0) >= 0;
                const dispCur = w.currentPrice != null ? convertAmount(w.currentPrice, w.currency, displayCurrency, fxRate) : null;
                return (
                  <div
                    key={w.id}
                    data-watch-index={i}
                    onContextMenu={(e) => handleWatchContextMenu(e, w)}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition select-none ${dragIndex === i ? "bg-blue-50 opacity-70" : ""}`}
                  >
                    <span
                      className="w-4 shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
                      title="드래그하여 순서 변경"
                      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startWatchDrag(i); }}
                      onPointerMove={(e) => moveWatchDrag(e.clientX, e.clientY)}
                      onPointerUp={endWatchDrag}
                      onPointerCancel={endWatchDrag}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-md">
                      {w.ticker.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{w.name}</div>
                      <div className="text-xs text-gray-400 truncate">{w.ticker}{w.market ? ` · ${w.market}` : ""}</div>
                    </div>
                    <div className="w-24 text-right text-sm font-semibold text-gray-900">
                      {formatMoney(dispCur, displayCurrency)}
                    </div>
                    <div className={`w-16 text-right text-xs font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
                      {changePct != null ? `${positive ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
                    </div>
                    <div className="hidden md:block w-20">
                      {spark.length > 1 && (
                        <Sparkline points={spark} color={positive ? "#10b981" : "#ef4444"} />
                      )}
                    </div>
                    <button
                      onClick={() => removeWatch(w.ticker)}
                      title="관심 해제"
                      className="w-6 shrink-0 flex items-center justify-center text-yellow-400 hover:text-gray-300 transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <button onClick={(e) => handleWatchContextMenu(e, w)} title="더보기" className="w-6 shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardShell>

      <CardShell
        title="최근 활동"
        action={
          <Link href="/cycles" className="text-xs text-blue-600 hover:underline font-medium">모든 활동 보기</Link>
        }
      >
        <div className="divide-y divide-gray-100 -mx-5 px-5">
          <ActivityItem type="buy" message="TQQQ 매수 신호 발생" time="11:30" />
          <ActivityItem type="sell" message="SOXL 매도 신호 발생" time="09:20" />
          <ActivityItem type="rebalance" message="리밸런싱 완료" time="어제 16:10" />
        </div>
      </CardShell>
      </div>

      <MarketInsightsPanel />

      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          items={[
            { label: "수정", onClick: () => setEditing(menu.holding) },
            { label: "삭제", onClick: () => deleteHolding(menu.holding.id) },
          ]}
          onClose={() => setMenu(null)}
        />
      )}

      {watchMenu && (
        <ContextMenu
          x={watchMenu.x} y={watchMenu.y}
          items={[
            {
              label: "보유 종목으로 이동",
              onClick: () => {
                const item = watchMenu.watchItem;
                setShowForm(true);
                setForm({ name: item.name, quantity: "", avgPrice: "", currency: item.currency, broker: "manual" });
              },
            },
          ]}
          onClose={() => setWatchMenu(null)}
        />
      )}

      {brokerModal.open && (
        <BrokerConnectionModal
          initialBroker={brokerModal.broker}
          onClose={() => setBrokerModal({ open: false, broker: "kis" })}
          onImported={() => fetchHoldings()}
        />
      )}

      {showWatchAdd && (
        <WatchlistAddModal
          existingTickers={watchlist.map((w) => w.ticker)}
          onClose={() => setShowWatchAdd(false)}
          onAdded={fetchWatchlist}
        />
      )}

      {editing && (
        <EditHoldingForm
          holding={editing}
          onSave={() => { setEditing(null); fetchHoldings(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </DashboardShell>
  );
}

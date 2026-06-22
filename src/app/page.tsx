"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import RingProgress from "@/components/RingProgress";
import Sparkline from "@/components/Sparkline";
import ActivityItem from "@/components/ActivityItem";
import CsvUploader from "@/components/CsvUploader";
import ContextMenu from "@/components/ContextMenu";
import EditHoldingForm from "@/components/EditHoldingForm";
import BrokerConnectionModal from "@/components/BrokerConnectionModal";

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
  const { data: session, status } = useSession();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "", avgPrice: "", currency: "KRW", broker: "manual" });
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; holding: Holding } | null>(null);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [showKis, setShowKis] = useState(false);

  const fetchHoldings = useCallback(async () => {
    const res = await fetch("/api/holdings");
    if (res.ok) setHoldings(await res.json());
  }, []);

  const refreshPrices = useCallback(async () => {
    await fetch("/api/holdings/refresh", { method: "POST" });
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchHoldings();
      refreshPrices();
      const interval = setInterval(refreshPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [status, fetchHoldings, refreshPrices]);

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

  const handleCsvUpload = async (items: Record<string, string>[]) => {
    for (const item of items) {
      await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item["종목명"] || item["name"] || "",
          quantity: parseFloat(item["수량"] || item["quantity"] || "0"),
          avgPrice: parseFloat(item["평균단가"] || item["avgprice"] || item["avg_price"] || "0"),
          currency: (item["통화"] || item["currency"] || "KRW").toUpperCase(),
          broker: "csv",
        }),
      });
    }
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

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  if (status === "unauthenticated") {
    if (authView === "register") return <RegisterView onBack={() => setAuthView("login")} />;
    return <LoginView onRegister={() => setAuthView("register")} />;
  }

  const sym = (c: string) => (c === "USD" ? "$" : "₩");
  const hasPriceHolding = holdings.filter((h) => h.currentPrice !== null);
  const totalAsset = hasPriceHolding.reduce((s, h) => s + (h.currentPrice! * h.quantity), 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0);
  const totalGain = totalAsset - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  // 실현 수익은 매도 기록/외부 API가 있어야 계산 가능 → 현재 미지원이라 비활성화 (추후 복구)
  // const realized = 0;

  const mockSparkline = (seed: number, trend: "up" | "down" = "up") => {
    const points: number[] = [];
    let v = 50;
    for (let i = 0; i < 12; i++) {
      v += ((seed * (i + 1)) % 7) - 3 + (trend === "up" ? 1.5 : -1.5);
      points.push(Math.max(10, v));
    }
    return points;
  };

  const rebalancePct = holdings.length > 0 ? 78 : 0;
  const nextRebalance = "2026.06.21";

  return (
    <DashboardShell
      title="VR 리밸런싱"
      rightSlot={
        <div className="flex items-center gap-2">
          <button onClick={() => setShowKis(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
            🏦 증권사 연동
          </button>
          <CsvUploader onUpload={handleCsvUpload} />
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition">
            {showForm ? "취소" : "+ 종목 추가"}
          </button>
        </div>
      }
    >
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">안녕하세요, {session?.user?.name || "원석"}님 👋</h2>
        <p className="text-sm text-gray-500 mt-1">오늘도 현명한 투자를 응원합니다.</p>
      </div>

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
                <option value="KRW">₩</option>
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
                <option value="kb">KB증권</option>
                <option value="ls">LS증권</option>
                <option value="csv">CSV 업로드</option>
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
          unit="₩"
          value={totalAsset.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          change={`${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}%`}
          changePositive={totalGainPct >= 0}
          subtext="전일 대비"
        />
        <StatCard
          label="총 수익"
          unit="₩"
          value={Math.abs(totalGain).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
              + 종목 추가
            </button>
          }
          className="lg:col-span-2"
        >
          {holdings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">보유중인 종목이 없습니다.<br />종목 추가 버튼을 눌러 시작해보세요.</p>
          ) : (
            <div className="divide-y divide-gray-100 -mx-5">
              {holdings.map((h, idx) => {
                const unit = sym(h.currency);
                const hasPrice = h.currentPrice !== null;
                const gainPct = hasPrice ? ((h.currentPrice! - h.avgPrice) / h.avgPrice) * 100 : 0;
                const positive = gainPct >= 0;
                const spark = mockSparkline(idx + 1, positive ? "up" : "down");
                return (
                  <div key={h.id} onContextMenu={(e) => handleContextMenu(e, h)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {h.ticker.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{h.name}</div>
                      <div className="text-xs text-gray-400">{h.ticker} · {h.broker === "manual" ? "수동" : h.broker.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{unit}{hasPrice ? h.currentPrice!.toLocaleString() : "—"}</div>
                      <div className={`text-xs font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
                        {hasPrice ? `${positive ? "+" : ""}${gainPct.toFixed(2)}%` : "미조회"}
                      </div>
                    </div>
                    <div className="hidden sm:block w-20">
                      <Sparkline points={spark} color={positive ? "#10b981" : "#ef4444"} />
                    </div>
                    <Link href={`/holdings/${h.id}`} className="text-gray-300 hover:text-gray-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </Link>
                  </div>
                );
              })}
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

      {showKis && <BrokerConnectionModal onClose={() => setShowKis(false)} onImported={() => fetchHoldings()} />}

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

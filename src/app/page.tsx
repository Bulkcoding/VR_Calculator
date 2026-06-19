"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import HoldingCard from "@/components/HoldingCard";
import CsvUploader from "@/components/CsvUploader";
import ContextMenu from "@/components/ContextMenu";
import EditHoldingForm from "@/components/EditHoldingForm";
import KisSettings from "@/components/KisSettings";

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

type ColCount = 1 | 2 | 3 | 4;

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">VR 리밸런싱</h1>
        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <input type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            로그인
          </button>
          <p className="text-sm text-gray-500 text-center">
            계정이 없으신가요?{" "}
            <button type="button" onClick={onRegister} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer">
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-green-600 font-medium">회원가입 완료!</p>
          <button onClick={onBack} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">회원가입</h1>
        <form onSubmit={handleRegister} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <input type="text" placeholder="이름 (선택)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="email" placeholder="이메일" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required minLength={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            가입하기
          </button>
          <p className="text-sm text-gray-500 text-center">
            이미 계정이 있으신가요?{" "}
            <button type="button" onClick={onBack} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer">
              로그인
            </button>
          </p>
        </form>
      </div>
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
  const [cols, setCols] = useState<ColCount>(3);

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

  const gridCols: Record<ColCount, string> = {
    1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  if (status === "unauthenticated") {
    if (authView === "register") return <RegisterView onBack={() => setAuthView("login")} />;
    return <LoginView onRegister={() => setAuthView("register")} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">VR 리밸런싱 대시보드</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowKis(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition">
            🏦 증권사 연동
          </button>
          <CsvUploader onUpload={handleCsvUpload} />
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            {showForm ? "취소" : "+ 종목 추가"}
          </button>
          {session?.user?.email && (
            <span className="text-xs text-gray-400 cursor-pointer hover:text-red-500"
              onClick={() => signOut()}>로그아웃</span>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={addHolding} className="mb-4 p-4 rounded-xl border border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input placeholder="종목명 (예: 삼성전자)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            required className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input placeholder="보유수량" type="number" step="any" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <div className="flex gap-1">
            <input placeholder="평균단가" type="number" step="any" value={form.avgPrice}
              onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="KRW">₩</option>
              <option value="USD">$</option>
            </select>
          </div>
          <div className="flex gap-1">
            <select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white">
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
          </div>
          <button type="submit" disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "종목 검색중..." : "추가"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <span>표시:</span>
        <div className="flex gap-1">
          {([1, 2, 3, 4] as ColCount[]).map((n) => (
            <button key={n} onClick={() => setCols(n)}
              className={`px-2 py-1 rounded border text-xs transition ${cols === n ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-100"}`}>{n}열</button>
          ))}
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">보유종목이 없습니다</p>
          <p className="text-sm">종목을 추가하거나 CSV 파일을 업로드해주세요</p>
        </div>
      ) : (
        <div className={`grid ${gridCols[cols]} gap-4`}>
          {holdings.map((h) => (
            <div key={h.id} onContextMenu={(e) => handleContextMenu(e, h)}>
              <HoldingCard {...h} />
            </div>
          ))}
        </div>
      )}

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

      {showKis && <KisSettings onClose={() => setShowKis(false)} onImported={() => fetchHoldings()} />}

      {editing && (
        <EditHoldingForm
          holding={editing}
          onSave={() => { setEditing(null); fetchHoldings(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

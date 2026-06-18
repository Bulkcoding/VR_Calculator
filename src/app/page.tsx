"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function DashboardPage() {
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
    const data = await res.json();
    setHoldings(data);
  }, []);

  const refreshPrices = useCallback(async () => {
    await fetch("/api/holdings/refresh", { method: "POST" });
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, 30000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        quantity: parseFloat(form.quantity),
        avgPrice: parseFloat(form.avgPrice),
        currency: form.currency,
        broker: form.broker,
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
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          VR 리밸런싱 대시보드
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKis(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            🏦 증권사 연동
          </button>
          <CsvUploader onUpload={handleCsvUpload} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            {showForm ? "취소" : "+ 종목 추가"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={addHolding}
          className="mb-4 p-4 rounded-xl border border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            placeholder="종목명 (예: 삼성전자)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            placeholder="보유수량"
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-1">
            <input
              placeholder="평균단가"
              type="number"
              step="any"
              value={form.avgPrice}
              onChange={(e) => setForm({ ...form, avgPrice: e.target.value })}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="KRW">₩</option>
              <option value="USD">$</option>
            </select>
          </div>
          <div className="flex gap-1">
            <select
              value={form.broker}
              onChange={(e) => setForm({ ...form, broker: e.target.value })}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
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
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "종목 검색중..." : "추가"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <span>표시:</span>
        <div className="flex gap-1">
          {([1, 2, 3, 4] as ColCount[]).map((n) => (
            <button
              key={n}
              onClick={() => setCols(n)}
              className={`px-2 py-1 rounded border text-xs transition ${
                cols === n
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:bg-gray-100"
              }`}
            >
              {n}열
            </button>
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
            <div
              key={h.id}
              onContextMenu={(e) => handleContextMenu(e, h)}
            >
              <HoldingCard {...h} />
            </div>
          ))}
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: "수정",
              onClick: () => setEditing(menu.holding),
            },
            {
              label: "삭제",
              onClick: () => deleteHolding(menu.holding.id),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}

      {showKis && (
        <KisSettings
          onClose={() => setShowKis(false)}
          onImported={() => fetchHoldings()}
        />
      )}

      {editing && (
        <EditHoldingForm
          holding={editing}
          onSave={() => {
            setEditing(null);
            fetchHoldings();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { calculateVr, type VrParams, type VrResult } from "@/lib/vr";
import PriceTable from "@/components/PriceTable";
import Link from "next/link";

interface HoldingDetail {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  currency: string;
}

interface VrCycleData {
  id: string;
  cycleNumber: number;
  startDate: string;
  endDate: string | null;
  vValue: number;
  bandPct: number;
  divisorG: number;
  contribution: number;
  pool: number;
  currentQty: number;
  minBand: number;
  maxBand: number;
  notes: string | null;
}

const currencySymbol = (c: string) => (c === "USD" ? "$" : "₩");

function CycleRow({
  cycle,
  onComplete,
  onUpdate,
  onDelete,
}: {
  cycle: VrCycleData;
  onComplete: (id: string) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(cycle.notes ?? "");

  const input = "w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500";

  const saveNotes = async () => {
    await onUpdate(cycle.id, { notes });
    setEditing(false);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-2 py-2 font-medium">{cycle.cycleNumber}</td>
      <td className="px-2 py-2 text-xs">{new Date(cycle.startDate).toLocaleDateString()}</td>
      <td className="px-2 py-2 text-xs">{cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : "진행중"}</td>
      <td className="px-2 py-2">{cycle.vValue.toLocaleString()}</td>
      <td className="px-2 py-2">{(cycle.bandPct * 100).toFixed(0)}%</td>
      <td className="px-2 py-2">{cycle.divisorG}</td>
      <td className="px-2 py-2">{cycle.pool.toLocaleString()}</td>
      <td className="px-2 py-2">{cycle.currentQty}</td>
      <td className="px-2 py-2">{cycle.minBand.toLocaleString()}</td>
      <td className="px-2 py-2">{cycle.maxBand.toLocaleString()}</td>
      <td className="px-2 py-2 max-w-[120px]">
        {editing ? (
          <div className="flex gap-1">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className={input} autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveNotes(); if (e.key === "Escape") setEditing(false); }} />
            <button onClick={saveNotes} className="text-xs text-blue-600 hover:text-blue-800">저장</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
          </div>
        ) : (
          <span onClick={() => setEditing(true)}
            className={`cursor-pointer block truncate ${cycle.notes ? "text-gray-700" : "text-gray-300"}`}>
            {cycle.notes || "클릭하여 입력"}
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <div className="flex gap-2">
          {!cycle.endDate && (
            <button onClick={() => onComplete(cycle.id)}
              className="text-xs text-blue-600 hover:text-blue-800">완료</button>
          )}
          <button onClick={() => onDelete(cycle.id)}
            className="text-xs text-red-400 hover:text-red-600">삭제</button>
        </div>
      </td>
    </tr>
  );
}

const defaultParams: VrParams = {
  vValue: 10000,
  bandPct: 0.15,
  divisorG: 10,
  contribution: 0,
  pool: 0,
  currentQty: 0,
};

export default function VrEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [holding, setHolding] = useState<HoldingDetail | null>(null);
  const [params, setParams] = useState<VrParams>(defaultParams);
  const [result, setResult] = useState<VrResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [cycles, setCycles] = useState<VrCycleData[]>([]);
  const [startingCycle, setStartingCycle] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/holdings");
    const data: HoldingDetail[] = await res.json();
    const h = data.find((d: any) => d.id === id);
    if (h) {
      setHolding(h);
      setParams((p) => ({ ...p, currentQty: h.quantity }));
    }
    const strategyRes = await fetch(`/api/vr-strategies/${id}`);
    if (strategyRes.ok) {
      const s = await strategyRes.json();
      if (s) setParams(s);
    }
    const cyclesRes = await fetch(`/api/vr-cycles/${id}`);
    if (cyclesRes.ok) setCycles(await cyclesRes.json());
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setResult(calculateVr(params)); }, [params]);

  const updateParam = (key: keyof VrParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) setParams((prev) => ({ ...prev, [key]: num }));
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/vr-strategies/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    setSaving(false);
  };

  const startCycle = async () => {
    setStartingCycle(true);
    await fetch(`/api/vr-cycles/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    setStartingCycle(false);
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
  };

  const completeCycle = async (cycleId: string) => {
    await fetch(`/api/vr-cycles/${id}?cycleId=${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: new Date().toISOString() }),
    });
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
  };

  const updateCycle = async (cycleId: string, data: Record<string, unknown>) => {
    await fetch(`/api/vr-cycles/${id}?cycleId=${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
  };

  const deleteCycle = async (cycleId: string) => {
    if (!confirm("정말 이 사이클을 삭제하시겠습니까?")) return;
    await fetch(`/api/vr-cycles/${id}?cycleId=${cycleId}`, {
      method: "DELETE",
    });
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const unit = holding ? currencySymbol(holding.currency) : "₩";
  const hasPrice = holding?.currentPrice !== null && holding?.currentPrice !== undefined;
  const gainPct = hasPrice ? ((holding!.currentPrice! - holding!.avgPrice) / holding!.avgPrice) * 100 : null;
  const gainAmount = hasPrice ? (holding!.currentPrice! - holding!.avgPrice) * holding!.quantity : null;

  const activeCycle = cycles.find((c) => !c.endDate);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">&larr; 대시보드</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {holding ? `${holding.name} (${holding.ticker})` : "로딩중..."}
        </h1>
      </div>

      {holding && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div><span className="text-gray-500">보유수량</span><p className="font-semibold">{holding.quantity.toLocaleString()}</p></div>
          <div><span className="text-gray-500">평균단가</span><p className="font-semibold">{unit}{holding.avgPrice.toLocaleString()}</p></div>
          <div><span className="text-gray-500">현재가</span><p className="font-semibold">{hasPrice ? `${unit}${holding.currentPrice!.toLocaleString()}` : "미조회"}</p></div>
          <div><span className="text-gray-500">평가손익</span><p className={`font-semibold ${gainPct !== null ? (gainPct >= 0 ? "text-red-500" : "text-blue-500") : ""}`}>{gainPct !== null ? `${gainPct >= 0 ? "+" : ""}${unit}${gainAmount!.toLocaleString()}` : "미조회"}</p></div>
          <div><span className="text-gray-500">수익률</span><p className={`font-semibold ${gainPct !== null ? (gainPct >= 0 ? "text-red-500" : "text-blue-500") : ""}`}>{gainPct !== null ? `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}%` : "미조회"}</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <h2 className="font-semibold text-gray-800">VR 파라미터</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">기준값 V</label>
              <input type="number" value={params.vValue} onChange={(e) => updateParam("vValue", e.target.value)} className={inputClass} step="any" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">밴드폭 ({(params.bandPct * 100).toFixed(0)}%)</label>
              <input type="range" min="0.01" max="0.5" step="0.01" value={params.bandPct} onChange={(e) => updateParam("bandPct", e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">분할 수 G</label>
              <input type="number" value={params.divisorG} onChange={(e) => updateParam("divisorG", e.target.value)} className={inputClass} min="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">적립금</label>
              <input type="number" value={params.contribution} onChange={(e) => updateParam("contribution", e.target.value)} className={inputClass} step="any" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">현재 Pool</label>
              <input type="number" value={params.pool} onChange={(e) => updateParam("pool", e.target.value)} className={inputClass} step="any" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">보유개수</label>
              <input type="number" value={params.currentQty} onChange={(e) => updateParam("currentQty", e.target.value)} className={inputClass} min="0" />
            </div>

            <div className="pt-2 space-y-2">
              <button onClick={save} disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? "저장중..." : "파라미터 저장"}
              </button>
              <button onClick={startCycle} disabled={startingCycle || !!activeCycle}
                className="w-full px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                {startingCycle ? "시작중..." : activeCycle ? `✅ ${activeCycle.cycleNumber}차 사이클 진행중` : "🔄 새 사이클 시작"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <div className="flex gap-4 text-sm">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
                  <span className="text-blue-600 font-semibold">최소밴드: {unit}{result.minBand.toLocaleString()}</span>
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-2">
                  <span className="text-orange-600 font-semibold">최대밴드: {unit}{result.maxBand.toLocaleString()}</span>
                </div>
              </div>
              <PriceTable result={result} currency={holding?.currency} />
            </>
          )}
        </div>
      </div>

      {/* 사이클 기록 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">📋 사이클 기록</h2>
          {cycles.length > 0 && (
            <button onClick={() => {
              const csv = [
                ["사이클","시작일","종료일","V","밴드폭%","G","Pool","보유수량","최소밴드","최대밴드","비고"].join(","),
                ...cycles.map(c => [
                  c.cycleNumber, c.startDate.slice(0,10), c.endDate?.slice(0,10) || "진행중",
                  c.vValue, (c.bandPct*100).toFixed(0), c.divisorG, c.pool, c.currentQty,
                  c.minBand, c.maxBand, `"${c.notes || ""}"`
                ].join(","))
              ].join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vr-cycles-${holding?.ticker || id}.csv`;
              a.click(); URL.revokeObjectURL(a.href);
            }} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-100 transition">
              CSV 내보내기
            </button>
          )}
        </div>

        {cycles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">아직 기록된 사이클이 없습니다.<br/>VR 파라미터를 설정하고 "새 사이클 시작"을 눌러주세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">시작</th>
                  <th className="px-2 py-2">종료</th>
                  <th className="px-2 py-2">V</th>
                  <th className="px-2 py-2">밴드</th>
                  <th className="px-2 py-2">G</th>
                  <th className="px-2 py-2">Pool</th>
                  <th className="px-2 py-2">수량</th>
                  <th className="px-2 py-2">최소밴드</th>
                  <th className="px-2 py-2">최대밴드</th>
                  <th className="px-2 py-2">비고</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <CycleRow
                    key={c.id}
                    cycle={c}
                    onComplete={completeCycle}
                    onUpdate={updateCycle}
                    onDelete={deleteCycle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

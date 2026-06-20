"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { calculateVr, type VrParams, type VrResult } from "@/lib/vr";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import RingProgress from "@/components/RingProgress";
import ActivityItem from "@/components/ActivityItem";

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

const defaultParams: VrParams = {
  vValue: 10000,
  bandPct: 0.1,
  divisorG: 21,
  contribution: 0,
  pool: 2000,
  currentQty: 0,
};

function HeroChart({ width = 240, height = 80, positive = true }: { width?: number; height?: number; positive?: boolean }) {
  const points: number[] = [];
  let v = 30;
  for (let i = 0; i < 30; i++) {
    v += ((i * 13) % 5) - 2 + (positive ? 1.2 : -1.2);
    points.push(Math.max(5, Math.min(height - 5, v)));
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${(height - ((p - min) / range) * (height - 10) - 5).toFixed(2)}`)
    .join(" ");
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const color = positive ? "#10b981" : "#ef4444";
  const id = `hero-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScheduleTable({ rows, type, symbol }: { rows: { qty: number; price: number; pool: number }[]; type: "buy" | "sell"; symbol: string }) {
  const isBuy = type === "buy";
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {isBuy ? "매수 예정" : "매도 예정"} <span className="text-xs text-gray-400 font-normal">({isBuy ? "분할 매수" : "분할 매도"})</span>
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${isBuy ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          자동 설정
        </span>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{isBuy ? "Pool 부족" : "매도 가능 수량 없음"}</p>
        ) : (
          rows.slice(0, 5).map((row, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`text-xs font-semibold w-12 ${isBuy ? "text-green-600" : "text-red-500"}`}>
                {i + 1}차 {isBuy ? "매수" : "매도"}
              </div>
              <div className={`text-sm font-bold w-20 ${isBuy ? "text-green-600" : "text-red-500"}`}>
                {symbol}{row.price.toLocaleString()}
              </div>
              <div className="flex-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBuy ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(100, ((i + 1) / Math.max(rows.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-gray-900">{row.qty} 주</div>
                <div className="text-gray-400">Pool {symbol}{row.pool.toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
      {rows.length > 0 && (
        <button className={`w-full mt-4 text-sm font-semibold ${isBuy ? "text-blue-600" : "text-red-500"}`}>
          전체 {isBuy ? "매수" : "매도"} 구간 보기 →
        </button>
      )}
    </div>
  );
}

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

  const saveNotes = async () => {
    await onUpdate(cycle.id, { notes });
    setEditing(false);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="px-3 py-3 text-sm font-medium text-gray-900">{cycle.cycleNumber}</td>
      <td className="px-3 py-3 text-sm text-gray-600">{new Date(cycle.startDate).toLocaleDateString()}</td>
      <td className="px-3 py-3 text-sm text-gray-600">{cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : "-"}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.vValue.toLocaleString()}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{(cycle.bandPct * 100).toFixed(0)}%</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.divisorG}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.pool.toLocaleString()}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.currentQty}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.minBand.toLocaleString()}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{cycle.maxBand.toLocaleString()}</td>
      <td className="px-3 py-3 text-sm">
        {cycle.endDate ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">완료</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">진행 중</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm">
        {editing ? (
          <div className="flex gap-1">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveNotes(); if (e.key === "Escape") setEditing(false); }} />
            <button onClick={saveNotes} className="text-xs text-blue-600 hover:text-blue-800">저장</button>
          </div>
        ) : (
          <span onClick={() => setEditing(true)} className="cursor-pointer text-gray-500 hover:text-gray-900">
            {cycle.notes || "—"}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="flex gap-2">
          {!cycle.endDate && (
            <button onClick={() => onComplete(cycle.id)} className="text-xs text-blue-600 hover:text-blue-800">완료</button>
          )}
          <button onClick={() => onDelete(cycle.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
        </div>
      </td>
    </tr>
  );
}

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
    await fetch(`/api/vr-cycles/${id}?cycleId=${cycleId}`, { method: "DELETE" });
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
  };

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const unit = holding ? currencySymbol(holding.currency) : "₩";
  const hasPrice = holding?.currentPrice !== null && holding?.currentPrice !== undefined;
  const gainPct = hasPrice ? ((holding!.currentPrice! - holding!.avgPrice) / holding!.avgPrice) * 100 : 0;
  const gainAmount = hasPrice ? (holding!.currentPrice! - holding!.avgPrice) * holding!.quantity : 0;
  const positive = gainPct >= 0;
  const activeCycle = cycles.find((c) => !c.endDate);
  const rebalancePct = 78;

  return (
    <DashboardShell
      title="포트폴리오로 돌아가기"
      rightSlot={
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
          더보기
        </button>
      }
    >
      <div className="mb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          ← 포트폴리오로 돌아가기
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {holding?.ticker.slice(0, 1) || "T"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{holding?.name || "로딩중..."}</h1>
                  {activeCycle && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">운용 중</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{holding?.ticker}</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900">{unit}{hasPrice ? holding!.currentPrice!.toLocaleString() : "—"}</span>
              {hasPrice && (
                <span className={`text-base font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>
                  {positive ? "+" : ""}{gainPct.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">오늘 {positive ? "+" : ""}1.82% · 미국 · 나스닥</p>

            <div className="mt-4">
              <HeroChart positive={positive} />
            </div>
          </div>

          <div className="lg:w-72 lg:border-l lg:border-gray-100 lg:pl-6 space-y-3">
            {[
              { label: "보유수량", value: `${holding?.quantity || 0} 주` },
              { label: "평균단가", value: `${unit}${holding?.avgPrice.toLocaleString() || 0}` },
              { label: "평가금액", value: `${unit}${hasPrice ? (holding!.currentPrice! * holding!.quantity).toLocaleString() : "—"}` },
              { label: "평가손익", value: `${positive ? "+" : ""}${unit}${Math.abs(gainAmount).toLocaleString()}`, accent: positive ? "green" : "red" },
              { label: "수익률", value: `${positive ? "+" : ""}${gainPct.toFixed(2)}%`, accent: positive ? "green" : "red" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className={`text-sm font-semibold ${row.accent === "green" ? "text-green-600" : row.accent === "red" ? "text-red-500" : "text-gray-900"}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="평가금액" value={hasPrice ? `$${(holding!.currentPrice! * holding!.quantity).toFixed(2)}` : "—"} subtext="전일 대비 +2.35%" />
        <StatCard label="평가손익" value={`+$${Math.abs(gainAmount).toFixed(2)}`} subtext="전일 대비 +$12.34" accent="green" changePositive />
        <StatCard label="수익률" value={`+${gainPct.toFixed(2)}%`} subtext="전일 대비 +2.11%" accent="green" changePositive />
        <StatCard label="보유수량" value={`${holding?.quantity || 0} 주`} subtext={`주문 가능 ${(holding?.quantity || 0)} 주`} />
        <StatCard label="현재 Pool" value="$2,000.00" subtext="사용 가능" accent="blue" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">VR 파라미터</h2>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "저장중..." : "파라미터 저장"}
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">
              기반값 불러오기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">기준값 (V)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={params.vValue} onChange={(e) => updateParam("vValue", e.target.value)} className={inputClass + " pl-6"} step="any" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">최소밴드</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={Math.round(result?.minBand ?? 0)} readOnly className={inputClass + " pl-6 bg-gray-50"} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">최대밴드</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={Math.round(result?.maxBand ?? 0)} readOnly className={inputClass + " pl-6 bg-gray-50"} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">밴드 (%)</label>
              <div className="relative">
                <input type="number" value={(params.bandPct * 100).toFixed(0)} onChange={(e) => updateParam("bandPct", (parseFloat(e.target.value) / 100).toString())} className={inputClass + " pr-7"} min="1" max="50" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">분할 수 (G)</label>
              <input type="number" value={params.divisorG} onChange={(e) => updateParam("divisorG", e.target.value)} className={inputClass} min="1" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">적립금</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={params.contribution} onChange={(e) => updateParam("contribution", e.target.value)} className={inputClass + " pl-6"} step="any" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">현재 Pool</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={params.pool} onChange={(e) => updateParam("pool", e.target.value)} className={inputClass + " pl-6"} step="any" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">보유개수</label>
              <input type="number" value={params.currentQty} onChange={(e) => updateParam("currentQty", e.target.value)} className={inputClass} min="0" />
            </div>
            <div className="flex items-end">
              <button onClick={startCycle} disabled={startingCycle || !!activeCycle}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {activeCycle ? `${activeCycle.cycleNumber}차 진행중` : "새 사이클 시작"}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">요약</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">최소밴드 (V - 밴드)</span>
                <span className="font-semibold text-blue-600">${Math.round(result?.minBand ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">최대밴드 (V + 밴드)</span>
                <span className="font-semibold text-red-500">${Math.round(result?.maxBand ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">밴드 범위</span>
                <span className="font-semibold text-gray-900">${Math.round((result?.maxBand ?? 0) - (result?.minBand ?? 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">1 구간 금액</span>
                <span className="font-semibold text-gray-900">${(100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ScheduleTable rows={result?.buyTable || []} type="buy" symbol="$" />
        <ScheduleTable rows={result?.sellTable || []} type="sell" symbol="$" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">현재 사이클</h3>
          </div>
          <div className="flex items-center gap-6">
            <RingProgress value={rebalancePct} size={120} label="진행률" sublabel="이번 사이클" />
            <div className="flex-1 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">V (기준값)</span><span className="font-semibold">${params.vValue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">G (분할 수)</span><span className="font-semibold">{params.divisorG}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">현재 Pool</span><span className="font-semibold">${params.pool.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">사이클 시작일</span><span className="font-semibold">2026.06.19</span></div>
              <div className="flex justify-between"><span className="text-gray-500">다음 리밸런싱</span><span className="font-semibold">2026.06.21</span></div>
            </div>
          </div>
          <button className="w-full mt-4 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">
            사이클 상세 보기 →
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">최근 활동</h3>
            <Link href="/cycles" className="text-xs text-blue-600 hover:underline">모든 활동 보기</Link>
          </div>
          <div className="divide-y divide-gray-100 -mx-5">
            <div className="px-5"><ActivityItem type="buy" message="TQQQ 매수 신호 발생" time="11:30" /></div>
            <div className="px-5"><ActivityItem type="sell" message="SOXL 매도 신호 발생" time="09:20" /></div>
            <div className="px-5"><ActivityItem type="rebalance" message="리밸런싱 완료" time="어제 16:10" /></div>
            <div className="px-5"><ActivityItem type="buy" message="TQQQ 매도 체결" time="06.18 14:32" /></div>
            <div className="px-5"><ActivityItem type="sell" message="SOXL 매수 체결" time="06.18 11:05" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">사이클 기록</h3>
          {cycles.length > 0 && (
            <button onClick={() => {
              const csv = [
                ["#","시작일","종료일","V","밴드%","G","Pool","수량","최소밴드","최대밴드","비고"].join(","),
                ...cycles.map(c => [
                  c.cycleNumber, c.startDate.slice(0,10), c.endDate?.slice(0,10) || "진행중",
                  c.vValue, (c.bandPct*100).toFixed(0), c.divisorG, c.pool, c.currentQty,
                  c.minBand, c.maxBand, `"${c.notes || ""}"`
                ].join(","))
              ].join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vr-cycles-${holding?.ticker || id}.csv`;
              a.click(); URL.revokeObjectURL(a.href);
            }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition">
              CSV 내보내기
            </button>
          )}
        </div>

        {cycles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">아직 기록된 사이클이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">시작일</th>
                  <th className="px-3 py-2">종료일</th>
                  <th className="px-3 py-2">V</th>
                  <th className="px-3 py-2">밴드</th>
                  <th className="px-3 py-2">G</th>
                  <th className="px-3 py-2">Pool</th>
                  <th className="px-3 py-2">수량</th>
                  <th className="px-3 py-2">최소밴드</th>
                  <th className="px-3 py-2">최대밴드</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">비고</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <CycleRow key={c.id} cycle={c} onComplete={completeCycle} onUpdate={updateCycle} onDelete={deleteCycle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

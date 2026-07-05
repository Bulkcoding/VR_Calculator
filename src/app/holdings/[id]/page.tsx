"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { calculateVr, BAND_PRESETS, MODE_LABELS, type BandPreset, type VrMode, type VrParams, type VrResult } from "@/lib/vr";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import RingProgress from "@/components/RingProgress";
import ActivityItem from "@/components/ActivityItem";
import StockChart from "@/components/StockChart";

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
  mode: string;
  vValue: number;
  bandPreset: number;
  bandPct: number;
  divisorG: number;
  contribution: number;
  withdrawal: number;
  tradeUnit: number;
  advanced: boolean;
  startPool: number | null;
  endPool: number | null;
  startEval: number | null;
  endEval: number | null;
  startQty: number | null;
  endQty: number | null;
  startPrice: number | null;
  endPrice: number | null;
  minBand: number | null;
  maxBand: number | null;
  notes: string | null;
}

const currencySymbol = (c: string) => (c === "USD" ? "$" : "₩");

const defaultParams: Omit<VrParams, "bandPct"> & { bandPreset: BandPreset } = {
  vValue: 0,
  bandPreset: 15,
  divisorG: 10,
  contribution: 0,
  withdrawal: 0,
  pool: 0,
  currentQty: 0,
  mode: "lump",
  advanced: false,
};

function ScheduleTable({
  rows, type, symbol, onUnitChange, capped,
}: {
  rows: { step: number; unit: number; qty: number; price: number; pool: number }[];
  type: "buy" | "sell";
  symbol: string;
  onUnitChange: (step: number, unit: number) => void;
  capped?: boolean;
}) {
  const isBuy = type === "buy";
  const [showAll, setShowAll] = useState(false);
  const [inputStr, setInputStr] = useState<Record<number, string>>({});
  const lastValidRef = useRef(rows);

  if (rows.length > 0) {
    lastValidRef.current = rows;
  }

  const accentText = isBuy ? "text-green-600" : "text-red-500";
  const accentBar = isBuy ? "bg-green-500" : "bg-red-500";

  const hasInvalidInput = rows.length === 0 && lastValidRef.current.length > 0;
  const activeRows = hasInvalidInput ? lastValidRef.current : rows;
  const displayRows = showAll ? activeRows : activeRows.slice(0, 8);

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

      <div className="space-y-1">
        {activeRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{isBuy ? "Pool 부족" : "매도 가능 수량 없음"}</p>
        ) : (
          <>
          {hasInvalidInput && (
            <p className="text-[11px] text-amber-600 text-center pb-1">
              현재 입력값으로 매수/매도표를 생성할 수 없습니다. 수량을 줄여보세요.
            </p>
          )}
          {displayRows
            .filter((row) => !(type === "sell" && row.qty <= 0))
            .map((row) => (
            <div key={row.step} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className={`text-xs font-semibold w-14 ${accentText}`}>
                {row.step}차 {isBuy ? "매수" : "매도"}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <input
                  type="number"
                  min="0"
                  value={inputStr[row.step] ?? row.unit}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInputStr((prev) => ({ ...prev, [row.step]: v }));
                    if (v === "" || v === "-") return;
                    const num = parseInt(v, 10);
                    if (!isNaN(num)) onUnitChange(row.step, Math.max(0, num));
                  }}
                  className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center bg-white"
                  title="매수/매도 수량 (주)"
                />
                <span className="text-[10px] text-gray-400">주</span>
              </div>
              <div className={`text-sm font-bold w-28 ${accentText}`}>
                {symbol}{row.price.toLocaleString()}
              </div>
              <div className="flex-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${accentBar}`} style={{ width: `${Math.min(100, (row.step / Math.max(activeRows.length, 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-gray-900">{row.qty}주</div>
                <div className="text-gray-400">Pool {symbol}{row.pool.toLocaleString()}</div>
              </div>
            </div>
          ))}
          </>
        )}
        {capped && isBuy && rows.length > 0 && (
          <p className="text-[11px] text-gray-400 text-center pt-1">
            현재 사이클 pool의 75% 근처까지만 사용할 수 있도록 매수 개수를 제한함.
          </p>
        )}
      </div>
      {activeRows.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`w-full mt-3 text-xs font-semibold ${accentText}`}
        >
          {showAll ? "접기 ∧" : `전체 ${activeRows.length}개 구간 보기 ∨`}
        </button>
      )}
    </div>
  );
}

function CycleRow({
  cycle,
  unit,
  onComplete,
  onUpdate,
  onDelete,
}: {
  cycle: VrCycleData;
  unit: string;
  onComplete: (id: string) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(cycle.notes ?? "");
  const [editingEnd, setEditingEnd] = useState(false);
  const [endPrice, setEndPrice] = useState(cycle.endPrice ?? 0);
  const [endQty, setEndQty] = useState(cycle.endQty ?? 0);

  const saveNotes = async () => { await onUpdate(cycle.id, { notes }); setEditing(false); };
  const saveEnd = async () => {
    await onUpdate(cycle.id, { endPrice: Number(endPrice), endQty: Number(endQty) });
    setEditingEnd(false);
  };

  const fmt = (n: number | null) => (n === null || n === undefined ? "—" : n.toLocaleString());

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="px-3 py-3 text-sm font-medium text-gray-900">{cycle.cycleNumber}</td>
      <td className="px-3 py-3 text-sm text-gray-600">{new Date(cycle.startDate).toLocaleDateString()}</td>
      <td className="px-3 py-3 text-sm text-gray-600">{cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : "-"}</td>
      <td className="px-3 py-3 text-sm">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">{MODE_LABELS[(cycle.mode as VrMode) || "lump"]}</span>
      </td>
      <td className="px-3 py-3 text-sm text-gray-900">{fmt(cycle.startEval)}</td>
      <td className="px-3 py-3 text-sm text-gray-900">
        {editingEnd ? (
          <div className="flex items-center gap-1">
            <input type="number" value={endPrice} onChange={(e) => setEndPrice(Number(e.target.value))} className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs" />
            <span className="text-xs text-gray-400">×</span>
            <input type="number" value={endQty} onChange={(e) => setEndQty(Number(e.target.value))} className="w-14 px-1 py-0.5 border border-gray-200 rounded text-xs" />
            <button onClick={saveEnd} className="text-xs text-blue-600">저장</button>
            <button onClick={() => setEditingEnd(false)} className="text-xs text-gray-400">×</button>
          </div>
        ) : (
          <span onClick={() => setEditingEnd(true)} className="cursor-pointer hover:text-blue-600">{fmt(cycle.endEval)}</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-gray-900">{fmt(cycle.vValue)}</td>
      <td className="px-3 py-3 text-sm text-gray-600">±{cycle.bandPreset}%</td>
      <td className="px-3 py-3 text-sm text-gray-900">{fmt(cycle.minBand)}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{fmt(cycle.maxBand)}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{fmt(cycle.startPool)}</td>
      <td className="px-3 py-3 text-sm text-gray-900">{fmt(cycle.endPool)}</td>
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
            <button onClick={saveNotes} className="text-xs text-blue-600">저장</button>
          </div>
        ) : (
          <span onClick={() => setEditing(true)} className="cursor-pointer text-gray-500 hover:text-gray-900">{cycle.notes || "—"}</span>
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
  const [params, setParams] = useState<Omit<VrParams, "bandPct"> & { bandPreset: BandPreset }>(defaultParams);
  const [result, setResult] = useState<VrResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [cycles, setCycles] = useState<VrCycleData[]>([]);
  const [startingCycle, setStartingCycle] = useState(false);
  const [buyUnits, setBuyUnits] = useState<number[]>(() => Array(30).fill(1));
  const [sellUnits, setSellUnits] = useState<number[]>(() => Array(30).fill(1));
  const [inputStr, setInputStr] = useState<Record<string, string>>({});

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
      if (s) {
        const preset = (s.bandPreset === 10 || s.bandPreset === 15 || s.bandPreset === 20) ? s.bandPreset : 15;
        setParams({
          vValue: s.vValue ?? 0,
          bandPreset: preset as BandPreset,
          divisorG: s.divisorG ?? 10,
          contribution: s.contribution ?? 0,
          withdrawal: s.withdrawal ?? 0,
          pool: s.pool ?? 0,
          currentQty: s.currentQty ?? (h?.quantity ?? 0),
          mode: (s.mode === "contribution" || s.mode === "withdrawal") ? s.mode : "lump",
          advanced: Boolean(s.advanced),
        });
      }
    }
    const cyclesRes = await fetch(`/api/vr-cycles/${id}`);
    if (cyclesRes.ok) setCycles(await cyclesRes.json());
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const bandPct = ({ 10: 0.1, 15: 0.15, 20: 0.2 } as const)[params.bandPreset];
    setResult(calculateVr({ ...params, bandPct }, { buyUnits, sellUnits }));
  }, [params, buyUnits, sellUnits]);

  const updateParam = <K extends keyof typeof params>(key: K, value: typeof params[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };
  const updateNumber = (key: keyof typeof params, value: string) => {
    setInputStr((prev) => ({ ...prev, [key]: value }));
    if (value === "" || value === "-") return;
    const num = parseFloat(value);
    if (!isNaN(num)) setParams((prev) => ({ ...prev, [key]: num as any }));
  };

  const save = async () => {
    setSaving(true);
    const bandPct = ({ 10: 0.1, 15: 0.15, 20: 0.2 } as const)[params.bandPreset];
    await fetch(`/api/vr-strategies/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, bandPct }),
    });
    setSaving(false);
  };

  const startCycle = async () => {
    setStartingCycle(true);
    const bandPct = ({ 10: 0.1, 15: 0.15, 20: 0.2 } as const)[params.bandPreset];
    await fetch(`/api/vr-cycles/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, bandPct, currentPrice: holding?.currentPrice ?? 0, cycleDays: 14 }),
    });
    setStartingCycle(false);
    const res = await fetch(`/api/vr-cycles/${id}`);
    if (res.ok) setCycles(await res.json());
    fetchData();
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
  const gainPct = hasPrice && holding
    ? ((holding.currentPrice! - holding.avgPrice) / holding.avgPrice) * 100
    : 0;
  const gainAmount = hasPrice && holding
    ? (holding.currentPrice! - holding.avgPrice) * holding.quantity
    : 0;
  const positive = gainPct >= 0;
  const activeCycle = cycles.find((c) => !c.endDate);
  const rebalancePct = 78;
  const modeBg: Record<VrMode, string> = { lump: "bg-blue-50 text-blue-700", contribution: "bg-green-50 text-green-700", withdrawal: "bg-orange-50 text-orange-700" };

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
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">← 포트폴리오로 돌아가기</Link>
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
                  {activeCycle && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">운용 중</span>}
                </div>
                <p className="text-xs text-gray-500">{holding?.ticker}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900">{unit}{hasPrice ? holding?.currentPrice?.toLocaleString() : "—"}</span>
              {hasPrice && <span className={`text-base font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>{positive ? "+" : ""}{gainPct.toFixed(2)}%</span>}
            </div>
            <p className="text-xs text-gray-500">오늘 {positive ? "+" : ""}1.82% · 미국 · 나스닥</p>
            <div className="mt-4">
              {holding ? (
                <StockChart
                  holdingId={holding.id}
                  symbol={holding.ticker}
                  positive={positive}
                  currencySymbol={unit}
                  height={140}
                />
              ) : (
                <div className="h-[140px] flex items-center justify-center text-xs text-gray-400">차트 로딩중...</div>
              )}
            </div>
          </div>
          <div className="lg:w-72 lg:border-l lg:border-gray-100 lg:pl-6 space-y-3">
            {[
              { label: "보유수량", value: `${holding?.quantity || 0} 주` },
              { label: "평균단가", value: `${unit}${holding?.avgPrice?.toLocaleString() || 0}` },
              { label: "평가금액", value: `${unit}${hasPrice ? (holding?.currentPrice! * (holding?.quantity || 0)).toLocaleString() : "—"}` },
              { label: "평가손익", value: `${positive ? "+" : ""}${unit}${Math.abs(gainAmount).toLocaleString()}`, accent: positive ? "green" : "red" },
              { label: "수익률", value: `${positive ? "+" : ""}${gainPct.toFixed(2)}%`, accent: positive ? "green" : "red" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className={`text-sm font-semibold ${row.accent === "green" ? "text-green-600" : row.accent === "red" ? "text-red-500" : "text-gray-900"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="평가금액" value={hasPrice ? `$${(holding?.currentPrice! * (holding?.quantity || 0)).toFixed(2)}` : "—"} subtext="전일 대비 +2.35%" />
        <StatCard label="평가손익" value={`${positive ? "+" : "-"}$${Math.abs(gainAmount).toFixed(2)}`} accent={positive ? "green" : "red"} changePositive={positive} />
        <StatCard label="수익률" value={`${positive ? "+" : ""}${gainPct.toFixed(2)}%`} accent={positive ? "green" : "red"} changePositive={positive} />
        <StatCard label="보유수량" value={`${holding?.quantity || 0} 주`} subtext={`주문 가능 ${(holding?.quantity || 0)} 주`} />
        <StatCard label="현재 Pool" value={`$${params.pool.toLocaleString()}`} subtext="사용 가능 (75%까지 매수)" accent="blue" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">VR 파라미터</h2>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startCycle} disabled={startingCycle || !!activeCycle}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50">
              {activeCycle ? `${activeCycle.cycleNumber}차 진행중` : startingCycle ? "시작중..." : "🔄 새 사이클 시작"}
            </button>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "저장중..." : "파라미터 저장"}
            </button>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">
              기반값 불러오기
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-semibold">계산 모드</span>
          {(["lump", "contribution", "withdrawal"] as VrMode[]).map((m) => (
            <button key={m} onClick={() => updateParam("mode", m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                params.mode === m
                  ? modeBg[m] + " border-current"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}>
              {MODE_LABELS[m]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">심화 계산식</span>
            <button onClick={() => updateParam("advanced", !params.advanced)}
              className={`relative w-9 h-5 rounded-full transition ${params.advanced ? "bg-blue-600" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition ${params.advanced ? "translate-x-4" : ""}`} />
            </button>
            <span className="text-xs text-gray-400">V2 = 21 + pool/G + (E-V1)/2√10</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">기준값 (V)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={inputStr.vValue ?? params.vValue} onChange={(e) => updateNumber("vValue", e.target.value)} className={inputClass + " pl-6"} step="any" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">최소밴드</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={Math.round(result?.minBand ?? 0)} readOnly className={inputClass + " pl-6 bg-gray-50 cursor-not-allowed"} tabIndex={-1} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">최대밴드</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={Math.round(result?.maxBand ?? 0)} readOnly className={inputClass + " pl-6 bg-gray-50 cursor-not-allowed"} tabIndex={-1} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-500 mb-1">밴드 (±%)</label>
              <div className="flex gap-1">
                {BAND_PRESETS.map((p) => (
                  <button key={p} onClick={() => updateParam("bandPreset", p)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition border ${
                      params.bandPreset === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}>±{p}%</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-500 mb-1">분할 수 (G)</label>
              <input type="number" value={inputStr.divisorG ?? params.divisorG} onChange={(e) => updateNumber("divisorG", e.target.value)} className={inputClass} min="1" />
            </div>

            {params.mode === "contribution" && (
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">적립금</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={inputStr.contribution ?? params.contribution} onChange={(e) => updateNumber("contribution", e.target.value)} className={inputClass + " pl-6"} step="any" />
                </div>
              </div>
            )}
            {params.mode === "withdrawal" && (
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">인출금</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={inputStr.withdrawal ?? params.withdrawal} onChange={(e) => updateNumber("withdrawal", e.target.value)} className={inputClass + " pl-6"} step="any" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-gray-500 mb-1">현재 Pool</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={inputStr.pool ?? params.pool} onChange={(e) => updateNumber("pool", e.target.value)} className={inputClass + " pl-6"} step="any" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">보유개수</label>
              <input type="number" value={inputStr.currentQty ?? params.currentQty} onChange={(e) => updateNumber("currentQty", e.target.value)} className={inputClass} min="0" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">요약</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">계산 모드</span>
                <span className="font-semibold text-gray-900">{MODE_LABELS[params.mode]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">최소밴드 (V - {params.bandPreset}%)</span>
                <span className="font-semibold text-blue-600">${Math.round(result?.minBand ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">최대밴드 (V + {params.bandPreset}%)</span>
                <span className="font-semibold text-red-500">${Math.round(result?.maxBand ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">밴드 범위</span>
                <span className="font-semibold text-gray-900">${Math.round((result?.maxBand ?? 0) - (result?.minBand ?? 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">1 구간 금액</span>
                <span className="font-semibold text-gray-900">${(params.pool / Math.max(1, params.divisorG)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">매수 한도 (75%)</span>
                <span className="font-semibold text-orange-600">${result?.poolCap.toLocaleString() ?? 0}</span>
              </div>
              {params.advanced && (
                <div className="pt-2 mt-2 border-t border-gray-200 text-[10px] text-gray-500 leading-relaxed">
                  심화: V2 = 21 + pool/G + (E-V1)/2√10
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ScheduleTable
          rows={result?.buyTable || []}
          type="buy"
          symbol="$"
          capped={result?.buyCapped}
          onUnitChange={(step, unit) => {
            const next = [...buyUnits];
            next[step - 1] = unit;
            setBuyUnits(next);
          }}
        />
        <ScheduleTable
          rows={result?.sellTable || []}
          type="sell"
          symbol="$"
          onUnitChange={(step, unit) => {
            const next = [...sellUnits];
            next[step - 1] = unit;
            setSellUnits(next);
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-semibold text-gray-900">현재 사이클</h3></div>
          <div className="flex items-center gap-6">
            <RingProgress value={rebalancePct} size={120} label="진행률" sublabel="이번 사이클" />
            <div className="flex-1 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">모드</span><span className="font-semibold">{MODE_LABELS[params.mode]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">V (기준값)</span><span className="font-semibold">${params.vValue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">밴드</span><span className="font-semibold">±{params.bandPreset}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">G (분할 수)</span><span className="font-semibold">{params.divisorG}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">현재 Pool</span><span className="font-semibold">${params.pool.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">사이클 시작일</span><span className="font-semibold">2026.06.19</span></div>
              <div className="flex justify-between"><span className="text-gray-500">다음 리밸런싱</span><span className="font-semibold">2026.06.21</span></div>
            </div>
          </div>
          <button className="w-full mt-4 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">사이클 상세 보기 →</button>
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
                ["#","시작일","종료일","모드","시작평가금","마지막평가금","V","밴드","시작pool","마지막pool","비고"].join(","),
                ...cycles.map(c => [
                  c.cycleNumber, c.startDate.slice(0,10), c.endDate?.slice(0,10) || "진행중", MODE_LABELS[(c.mode as VrMode) || "lump"],
                  c.startEval ?? "", c.endEval ?? "", c.vValue, `±${c.bandPreset}%`, c.startPool ?? "", c.endPool ?? "", `"${c.notes || ""}"`
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
                  <th className="px-3 py-2">모드</th>
                  <th className="px-3 py-2">시작평가금</th>
                  <th className="px-3 py-2">마지막평가금</th>
                  <th className="px-3 py-2">V</th>
                  <th className="px-3 py-2">밴드</th>
                  <th className="px-3 py-2">최소밴드</th>
                  <th className="px-3 py-2">최대밴드</th>
                  <th className="px-3 py-2">시작 pool</th>
                  <th className="px-3 py-2">마지막 pool</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">비고</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <CycleRow key={c.id} cycle={c} unit={unit} onComplete={completeCycle} onUpdate={updateCycle} onDelete={deleteCycle} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

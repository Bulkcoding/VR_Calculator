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

const currencySymbol = (c: string) => (c === "USD" ? "$" : "₩");

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
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setResult(calculateVr(params));
  }, [params]);

  const updateParam = (key: keyof VrParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setParams((prev) => ({ ...prev, [key]: num }));
    }
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

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const unit = holding ? currencySymbol(holding.currency) : "₩";
  const hasPrice = holding?.currentPrice !== null && holding?.currentPrice !== undefined;
  const gainPct = hasPrice ? ((holding!.currentPrice! - holding!.avgPrice) / holding!.avgPrice) * 100 : null;
  const gainAmount = hasPrice ? (holding!.currentPrice! - holding!.avgPrice) * holding!.quantity : null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; 대시보드
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {holding ? `${holding.name} (${holding.ticker})` : "로딩중..."}
        </h1>
      </div>

      {holding && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-500">보유수량</span>
            <p className="font-semibold text-gray-900">{holding.quantity.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">평균단가</span>
            <p className="font-semibold text-gray-900">{unit}{holding.avgPrice.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">현재가</span>
            <p className="font-semibold text-gray-900">
              {hasPrice ? `${unit}${holding.currentPrice!.toLocaleString()}` : "미조회"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">평가손익</span>
            <p className={`font-semibold ${gainPct !== null ? (gainPct >= 0 ? "text-red-500" : "text-blue-500") : "text-gray-900"}`}>
              {gainPct !== null
                ? `${gainPct >= 0 ? "+" : ""}${unit}${gainAmount!.toLocaleString()}`
                : "미조회"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">수익률</span>
            <p className={`font-semibold ${gainPct !== null ? (gainPct >= 0 ? "text-red-500" : "text-blue-500") : "text-gray-900"}`}>
              {gainPct !== null ? `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}%` : "미조회"}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <h2 className="font-semibold text-gray-800">VR 파라미터</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">기준값 V</label>
              <input
                type="number"
                value={params.vValue}
                onChange={(e) => updateParam("vValue", e.target.value)}
                className={inputClass}
                step="any"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                밴드폭 ({(params.bandPct * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={params.bandPct}
                onChange={(e) => updateParam("bandPct", e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">분할 수 G</label>
              <input
                type="number"
                value={params.divisorG}
                onChange={(e) => updateParam("divisorG", e.target.value)}
                className={inputClass}
                min="1"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">적립금</label>
              <input
                type="number"
                value={params.contribution}
                onChange={(e) => updateParam("contribution", e.target.value)}
                className={inputClass}
                step="any"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">현재 Pool</label>
              <input
                type="number"
                value={params.pool}
                onChange={(e) => updateParam("pool", e.target.value)}
                className={inputClass}
                step="any"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">보유개수</label>
              <input
                type="number"
                value={params.currentQty}
                onChange={(e) => updateParam("currentQty", e.target.value)}
                className={inputClass}
                min="0"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={save}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "저장중..." : "파라미터 저장"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              <div className="flex gap-4 text-sm">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
                  <span className="text-blue-600 font-semibold">
                    최소밴드: {unit}{result.minBand.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-2">
                  <span className="text-orange-600 font-semibold">
                    최대밴드: {unit}{result.maxBand.toLocaleString()}
                  </span>
                </div>
              </div>

              <PriceTable result={result} currency={holding?.currency} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

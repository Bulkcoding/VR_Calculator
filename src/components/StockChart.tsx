"use client";

import { useEffect, useState } from "react";
import type { ChartData } from "@/lib/stockApi";

interface StockChartProps {
  holdingId: string;
  symbol?: string;
  positive?: boolean;
  currencySymbol?: string;
  height?: number;
}

const RANGES = [
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

function buildPath(points: { price: number }[], width: number, height: number, pad: number) {
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const innerH = height - pad * 2;
  const stepX = width / (points.length - 1 || 1);

  let linePath = "";
  for (let i = 0; i < points.length; i++) {
    const x = i * stepX;
    const y = pad + innerH - ((points[i].price - min) / range) * innerH;
    linePath += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  const fillPath = `${linePath} L ${width} ${height - pad} L 0 ${height - pad} Z`;
  return { linePath, fillPath, min, max };
}

export default function StockChart({
  holdingId,
  symbol,
  positive = true,
  currencySymbol = "$",
  height = 140,
}: StockChartProps) {
  const [range, setRange] = useState("1mo");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    const onResize = () => {
      const el = document.getElementById("stock-chart-container");
      if (el) setWidth(el.clientWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchChart = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/holdings/${holdingId}/chart?range=${range}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "차트 로드 실패");
        }
        const d: ChartData = await res.json();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "차트 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (holdingId) fetchChart();
    return () => { cancelled = true; };
  }, [holdingId, range]);

  const pad = 8;
  const lineColor = data
    ? data.change >= 0
      ? "#10b981"
      : "#ef4444"
    : positive
    ? "#10b981"
    : "#ef4444";
  const gradId = `chart-grad-${holdingId}-${range}`;
  const path = data ? buildPath(data.points, width, height, pad) : null;

  const firstDate = data?.points[0]?.date ?? "";
  const lastDate = data?.points[data.points.length - 1]?.date ?? "";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              disabled={loading}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                range === r.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {data && (
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span>{firstDate}</span>
            <span className={`font-semibold ${data.change >= 0 ? "text-green-600" : "text-red-500"}`}>
              {data.change >= 0 ? "+" : ""}{currencySymbol}{data.change.toFixed(2)} ({data.changePct >= 0 ? "+" : ""}{data.changePct.toFixed(2)}%)
            </span>
            <span>{lastDate}</span>
          </div>
        )}
      </div>

      <div id="stock-chart-container" className="relative w-full" style={{ height }}>
        {loading && !data && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            차트 로딩중...
          </div>
        )}
        {error && !data && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400">
            {error}
          </div>
        )}
        {data && path && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path.fillPath} fill={`url(#${gradId})`} />
            <path d={path.linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle
              cx={width}
              cy={(() => {
                const last = data.points[data.points.length - 1].price;
                const innerH = height - pad * 2;
                return pad + innerH - ((last - path.min) / (path.max - path.min || 1)) * innerH;
              })()}
              r="3"
              fill={lineColor}
            />
          </svg>
        )}
        {data && (
          <div className="absolute top-1 right-1 text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
            {symbol && <span className="font-semibold">{symbol}</span>}
          </div>
        )}
      </div>

      {data && (
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span>최저 {currencySymbol}{path?.min.toFixed(2)}</span>
          <span>최고 {currencySymbol}{path?.max.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

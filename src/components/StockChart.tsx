"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { ChartData, ChartPoint } from "@/lib/stockApi";

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

function priceToY(price: number, min: number, max: number, height: number, pad: number) {
  const range = max - min || 1;
  const innerH = height - pad * 2;
  return pad + innerH - ((price - min) / range) * innerH;
}

function formatVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

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
  const stepX = data ? width / (data.points.length - 1 || 1) : 0;
  const innerH = height - pad * 2;

  const handleMove = useCallback(
    (clientX: number) => {
      if (!data || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      if (x < 0 || x > width) {
        setHoverIndex(null);
        return;
      }
      const idx = Math.round((x / width) * (data.points.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.points.length - 1, idx)));
    },
    [data, width]
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => handleMove(e.clientX);
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsPressed(true);
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPressed(true);
    handleMove(e.clientX);
  };
  const handleLeave = () => {
    setHoverIndex(null);
    setIsPressed(false);
  };
  const handleTouchEnd = () => {
    setIsPressed(false);
    setHoverIndex(null);
  };

  const firstDate = data?.points[0]?.date ?? "";
  const lastDate = data?.points[data.points.length - 1]?.date ?? "";
  const hoverPoint = hoverIndex !== null && data ? data.points[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? stepX * hoverIndex : 0;
  const hoverY = hoverPoint && path ? priceToY(hoverPoint.price, path.min, path.max, height, pad) : 0;

  return (
    <div className="w-full select-none">
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

      <div
        id="stock-chart-container"
        className="relative w-full touch-none"
        style={{ height }}
        onMouseLeave={handleLeave}
        onTouchEnd={handleTouchEnd}
      >
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
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path.fillPath} fill={`url(#${gradId})`} />
            <path d={path.linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {hoverIndex !== null && hoverPoint && (
              <g>
                {/* 수직 크로스헤어 */}
                <line
                  x1={hoverX}
                  y1={pad}
                  x2={hoverX}
                  y2={height - pad}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  pointerEvents="none"
                />
                {/* 수평 크로스헤어 */}
                <line
                  x1={0}
                  y1={hoverY}
                  x2={width}
                  y2={hoverY}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  pointerEvents="none"
                />
                {/* 데이터 포인트 도트 */}
                <circle
                  cx={hoverX}
                  cy={hoverY}
                  r="4"
                  fill="white"
                  stroke={lineColor}
                  strokeWidth="2"
                  pointerEvents="none"
                />
              </g>
            )}

            {!hoverIndex && (
              <circle
                cx={width}
                cy={(() => {
                  const last = data.points[data.points.length - 1].price;
                  return priceToY(last, path.min, path.max, height, pad);
                })()}
                r="3"
                fill={lineColor}
                pointerEvents="none"
              />
            )}
          </svg>
        )}

        {data && (
          <div className="absolute top-1 right-1 text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none">
            {symbol && <span className="font-semibold">{symbol}</span>}
          </div>
        )}

        {/* OHLC 툴팁 — 우상단 고정 */}
        {hoverPoint && path && (
          <div
            className="absolute z-20 top-1 right-1 pointer-events-none bg-white/95 border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-[11px] min-w-[160px]"
          >
            <div className="font-semibold text-gray-900 mb-1.5 pb-1 border-b border-gray-100">
              {hoverPoint.date}
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">시가</span>
                <span className="font-mono text-gray-900">
                  {currencySymbol}{hoverPoint.open?.toFixed(2) ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">고가</span>
                <span className="font-mono text-red-500">
                  {currencySymbol}{hoverPoint.high?.toFixed(2) ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">저가</span>
                <span className="font-mono text-blue-500">
                  {currencySymbol}{hoverPoint.low?.toFixed(2) ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-gray-100">
                <span className="text-gray-700 font-semibold">종가</span>
                <span className="font-mono font-bold text-gray-900">
                  {currencySymbol}{hoverPoint.close.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">거래량</span>
                <span className="font-mono text-gray-600">
                  {formatVolume(hoverPoint.volume)}
                </span>
              </div>
            </div>
            {isPressed && (
              <div className="text-[9px] text-gray-400 mt-1.5 text-center">📌 고정됨 (떼면 해제)</div>
            )}
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

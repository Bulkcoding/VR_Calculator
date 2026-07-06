"use client";

import { useTheme } from "@/components/ThemeProvider";

export interface CycleEndingAlertData {
  cycleId: string;
  holdingId: string;
  holdingName: string;
  ticker: string;
  cycleNumber: number;
  startDate: string;
  estimatedEndDate: string;
  daysRemaining: number;
  progress: number;
  additionalCount: number;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatKoreanDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}

function CycleProgressIcon({
  progress,
  color,
  trackColor,
  fillColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
  fillColor: string;
}) {
  const size = 124;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="1 13"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div
        className="absolute flex h-16 w-16 items-center justify-center rounded-full shadow-sm"
        style={{ backgroundColor: fillColor }}
      >
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  );
}

export default function CycleEndingAlertModal({
  alert,
  onClose,
  onLater,
  onDetails,
}: {
  alert: CycleEndingAlertData | null;
  onClose: () => void;
  onLater: () => void;
  onDetails: () => void;
}) {
  const { currentTheme } = useTheme();

  if (!alert) return null;

  const isDueToday = alert.daysRemaining <= 0;
  const daysLabel = isDueToday ? "오늘" : `${alert.daysRemaining}일`;
  const primary = currentTheme.palette.primary;
  const accent = currentTheme.palette.accent;
  const surface = currentTheme.palette.surface;
  const background = currentTheme.palette.background;
  const borderColor = hexToRgba(primary, currentTheme.appearance === "dark" ? 0.28 : 0.2);
  const softPrimary = hexToRgba(primary, currentTheme.appearance === "dark" ? 0.16 : 0.1);
  const softAccent = hexToRgba(accent, currentTheme.appearance === "dark" ? 0.18 : 0.12);
  const mutedText = currentTheme.appearance === "dark" ? hexToRgba("#f4f7fb", 0.72) : hexToRgba("#111827", 0.58);
  const cardShadow =
    currentTheme.appearance === "dark"
      ? "0 24px 80px rgba(2, 6, 23, 0.56)"
      : "0 24px 70px rgba(15, 23, 42, 0.16)";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div
        className="relative w-full max-w-[920px] overflow-hidden rounded-[32px] border"
        style={{
          borderColor,
          background: `linear-gradient(145deg, ${surface} 0%, ${background} 100%)`,
          boxShadow: cardShadow,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at top left, ${softPrimary}, transparent 34%), radial-gradient(circle at top right, ${softAccent}, transparent 30%)`,
          }}
        />

        <button
          type="button"
          aria-label="알림 닫기"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="relative px-6 pb-8 pt-10 text-center sm:px-10 sm:pb-10 sm:pt-12">
          <CycleProgressIcon
            progress={alert.progress}
            color={primary}
            trackColor={hexToRgba(primary, currentTheme.appearance === "dark" ? 0.24 : 0.2)}
            fillColor={primary}
          />

          <p className="mt-5 text-lg font-semibold text-gray-900 sm:text-[2rem]">현재 진행 상태</p>
          <h2 className="mt-4 text-[2rem] font-extrabold leading-tight text-gray-900 sm:text-[3.3rem]">
            새로운 사이클 종료까지{" "}
            <span style={{ color: primary }}>{daysLabel}</span>
            {" "}남았어요
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-[1.65rem]" style={{ color: mutedText }}>
            현재 <span className="font-semibold text-gray-900">{alert.holdingName}</span> ({alert.ticker}) 사이클이 안정적으로 진행 중입니다.
            <br />
            종료 예정일에 맞춰 다음 사이클이 자동으로 준비됩니다.
          </p>
          {alert.additionalCount > 0 && (
            <p className="mt-4 text-sm font-medium sm:text-base" style={{ color: accent }}>
              이외에도 {alert.additionalCount}개 종목의 사이클이 곧 종료될 예정입니다.
            </p>
          )}

          <div
            className="mx-auto mt-10 rounded-[28px] border p-5 text-left sm:mt-12 sm:p-7"
            style={{
              borderColor,
              backgroundColor: hexToRgba(surface, currentTheme.appearance === "dark" ? 0.92 : 0.8),
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-0">
              <div className="sm:border-r sm:pr-8" style={{ borderColor }}>
                <div className="text-sm font-semibold sm:text-base" style={{ color: mutedText }}>진행률</div>
                <div className="mt-2 text-4xl font-extrabold sm:text-5xl" style={{ color: primary }}>
                  {Math.round(alert.progress)}%
                </div>
              </div>
              <div className="sm:pl-8">
                <div className="text-sm font-semibold sm:text-base" style={{ color: mutedText }}>다음 리밸런싱 예정일</div>
                <div className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  {formatKoreanDate(alert.estimatedEndDate)}
                </div>
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full" style={{ backgroundColor: hexToRgba(primary, 0.12) }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${alert.progress}%`,
                  background: `linear-gradient(90deg, ${primary} 0%, ${accent} 100%)`,
                }}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
            <button
              type="button"
              onClick={onLater}
              className="rounded-[22px] border px-6 py-4 text-xl font-semibold transition sm:text-[1.7rem]"
              style={{
                borderColor,
                color: primary,
                backgroundColor: hexToRgba(surface, currentTheme.appearance === "dark" ? 0.92 : 0.86),
              }}
            >
              나중에 보기
            </button>
            <button
              type="button"
              onClick={onDetails}
              className="rounded-[22px] px-6 py-4 text-xl font-semibold text-white transition hover:opacity-95 sm:text-[1.7rem]"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
              }}
            >
              상세 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

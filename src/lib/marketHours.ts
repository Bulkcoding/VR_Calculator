const HOUR_MS = 60 * 60 * 1000;

export interface MarketSession {
  id: string;
  label: string;
  market: "kr" | "us";
  open: number;
  close: number;
  isOpen: boolean;
  timeLabel: string;
}

export type USMarketSeason = "summer" | "standard";

const KR_REGULAR = {
  id: "kr-regular",
  label: "국내 정규장",
  market: "kr" as const,
  open: 9,
  close: 15.5,
  timeLabel: "09:00 ~ 15:30",
};

const US_REGULAR_BY_SEASON: Record<
  USMarketSeason,
  { open: number; close: number; offset: number; timeLabel: string }
> = {
  summer: {
    open: 22.5,
    close: 5,
    offset: 13,
    timeLabel: "22:30 ~ 05:00",
  },
  standard: {
    open: 23.5,
    close: 6,
    offset: 14,
    timeLabel: "23:30 ~ 06:00",
  },
};

function isUSDST(now: Date): boolean {
  const year = now.getUTCFullYear();
  const mar8 = new Date(Date.UTC(year, 2, 8));
  const marSunday = 8 + ((7 - mar8.getUTCDay()) % 7);
  const dstStart = new Date(Date.UTC(year, 2, marSunday, 7));

  const nov1 = new Date(Date.UTC(year, 10, 1));
  const novSunday = 1 + ((7 - nov1.getUTCDay()) % 7);
  const dstEnd = new Date(Date.UTC(year, 10, novSunday, 6));

  const t = now.getTime();
  return t >= dstStart.getTime() && t < dstEnd.getTime();
}

function getKstNow(now: Date): { h: number; m: number; day: number } {
  const kst = new Date(now.getTime() + 9 * HOUR_MS);
  return {
    h: kst.getUTCHours(),
    m: kst.getUTCMinutes(),
    day: kst.getUTCDay(),
  };
}

function inRange(h: number, m: number, open: number, close: number): boolean {
  const nowMin = h * 60 + m;
  const openMin = open * 60;
  const closeMin = close * 60;

  if (close < open) {
    return nowMin >= openMin || nowMin < closeMin;
  }

  return nowMin >= openMin && nowMin < closeMin;
}

export function getUSMarketSeason(now: Date = new Date()): USMarketSeason {
  return isUSDST(now) ? "summer" : "standard";
}

export function getMarketSessions(now: Date = new Date()): MarketSession[] {
  const kstNow = getKstNow(now);
  const usSeason = getUSMarketSeason(now);
  const usRegularHours = US_REGULAR_BY_SEASON[usSeason];
  const etNow = new Date(now.getTime() + (9 - usRegularHours.offset) * HOUR_MS);
  const isKrWeekday = kstNow.day >= 1 && kstNow.day <= 5;
  const isUsWeekday = etNow.getUTCDay() >= 1 && etNow.getUTCDay() <= 5;

  const krRegular: MarketSession = {
    ...KR_REGULAR,
    isOpen: isKrWeekday && inRange(kstNow.h, kstNow.m, KR_REGULAR.open, KR_REGULAR.close),
  };

  const usRegular: MarketSession = {
    id: "us-regular",
    label: "미국 정규장",
    market: "us",
    open: usRegularHours.open,
    close: usRegularHours.close,
    isOpen: isUsWeekday && inRange(kstNow.h, kstNow.m, usRegularHours.open, usRegularHours.close),
    timeLabel: usRegularHours.timeLabel,
  };

  return [krRegular, usRegular];
}
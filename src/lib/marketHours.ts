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

interface UsSessionDef {
  id: string;
  label: string;
  openET: number;
  closeET: number;
}

const US_SESSIONS_ET: UsSessionDef[] = [
  { id: "us-premarket",  label: "해외 프리마켓",   openET: 4,   closeET: 9.5 },
  { id: "us-regular",    label: "해외 정규장",     openET: 9.5, closeET: 16 },
  { id: "us-aftermarket",label: "해외 애프터마켓", openET: 16,  closeET: 20 },
];

interface UsSessionConverted {
  id: string;
  label: string;
  open: number;
  close: number;
  timeLabel: string;
}

function convertUsSession(s: UsSessionDef, offset: number): UsSessionConverted {
  const open = (s.openET + offset) % 24;
  const close = (s.closeET + offset) % 24;
  const fmt = (n: number) => {
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return { id: s.id, label: s.label, open, close, timeLabel: `${fmt(open)} ~ ${fmt(close)}` };
}

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
  const offset = usSeason === "summer" ? 13 : 14;
  const etNow = new Date(now.getTime() + (9 - offset) * HOUR_MS);
  const isKrWeekday = kstNow.day >= 1 && kstNow.day <= 5;
  const isUsWeekday = etNow.getUTCDay() >= 1 && etNow.getUTCDay() <= 5;

  const krRegular: MarketSession = {
    ...KR_REGULAR,
    isOpen: isKrWeekday && inRange(kstNow.h, kstNow.m, KR_REGULAR.open, KR_REGULAR.close),
  };

  const usSessions: MarketSession[] = US_SESSIONS_ET.map((s) => {
    const converted = convertUsSession(s, offset);
    return {
      ...converted,
      market: "us" as const,
      isOpen: isUsWeekday && inRange(kstNow.h, kstNow.m, converted.open, converted.close),
    };
  });

  return [krRegular, ...usSessions];
}
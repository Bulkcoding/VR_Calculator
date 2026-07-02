// 한국/미국 장시간 계산 유틸
// - 한국: KST 고정, 서머타임 없음
// - 미국: DST(서머타임) 자동 감지 (3월 둘째주 일 ~ 11월 첫째주 일)

export interface MarketSession {
  id: string;
  label: string;
  market: "kr" | "us";
  open: number;   // 시작 hour (KST 기준)
  close: number;  // 종료 hour (KST 기준, close < open 이면 다음날)
  isOpen: boolean;
  timeLabel: string;
}

function isUSDST(now: Date): boolean {
  const year = now.getUTCFullYear();
  // 3월 둘째주 일요일 07:00 UTC = 02:00 ET
  const mar8 = new Date(Date.UTC(year, 2, 8));
  const marSunday = 8 + ((7 - mar8.getUTCDay()) % 7);
  const dstStart = new Date(Date.UTC(year, 2, marSunday, 7));

  // 11월 첫째주 일요일 06:00 UTC = 01:00 ET (DST 종료)
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const novSunday = 1 + ((7 - nov1.getUTCDay()) % 7);
  const dstEnd = new Date(Date.UTC(year, 10, novSunday, 6));

  const t = now.getTime();
  return t >= dstStart.getTime() && t < dstEnd.getTime();
}

function getKstNow(): { h: number; m: number } {
  // 현재 UTC 시간에 9시간 더하기 = KST
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { h: kst.getUTCHours(), m: kst.getUTCMinutes() };
}

function inRange(h: number, m: number, open: number, close: number): boolean {
  const nowMin = h * 60 + m;
  const openMin = open * 60;
  const closeMin = close * 60;
  if (close < open) {
    // 자정 넘김: 22~05 → 22:00~24:00 || 00:00~05:00
    return nowMin >= openMin || nowMin < closeMin;
  }
  return nowMin >= openMin && nowMin < closeMin;
}

function fmtTime(open: number, close: number): string {
  const oh = Math.floor(open);
  const om = Math.round((open - oh) * 60);
  const ch = Math.floor(close);
  const cm = Math.round((close - ch) * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(oh)}:${pad(om)} ~ ${pad(ch)}:${pad(cm)}`;
}

export function getMarketSessions(): MarketSession[] {
  const { h, m } = getKstNow();
  const now = new Date();
  const offset = isUSDST(now) ? 13 : 14; // KST - ET

  // 한국 정규장: 09:00 ~ 15:30 KST
  const krRegular: MarketSession = {
    id: "kr-regular",
    label: "국내 정규장",
    market: "kr",
    open: 9,
    close: 15.5,
    isOpen: inRange(h, m, 9, 15.5),
    timeLabel: "09:00 ~ 15:30",
  };

  // US 세션: ET → KST 변환 (ET + offset)
  // 프리마켓: 04:00~09:30 ET
  const preOpen = (4 + offset) % 24;
  const preClose = (9.5 + offset) % 24;

  // 정규장: 09:30~16:00 ET
  const regOpen = (9.5 + offset) % 24;
  const regClose = (16 + offset) % 24;

  // 애프터마켓: 16:00~20:00 ET
  const afterOpen = (16 + offset) % 24;
  const afterClose = (20 + offset) % 24;

  const usPre: MarketSession = {
    id: "us-premarket",
    label: "해외 프리마켓",
    market: "us",
    open: preOpen,
    close: preClose,
    isOpen: inRange(h, m, preOpen, preClose),
    timeLabel: fmtTime(preOpen, preClose),
  };

  const usRegular: MarketSession = {
    id: "us-regular",
    label: "해외 정규장",
    market: "us",
    open: regOpen,
    close: regClose,
    isOpen: inRange(h, m, regOpen, regClose),
    timeLabel: fmtTime(regOpen, regClose),
  };

  const usAfter: MarketSession = {
    id: "us-aftermarket",
    label: "해외 애프터마켓",
    market: "us",
    open: afterOpen,
    close: afterClose,
    isOpen: inRange(h, m, afterOpen, afterClose),
    timeLabel: fmtTime(afterOpen, afterClose),
  };

  return [krRegular, usPre, usRegular, usAfter];
}

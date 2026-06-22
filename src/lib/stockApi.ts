export interface StockSearchResult {
  ticker: string;
  name: string;
  market: string;
}

export interface ChartPoint {
  date: string;
  time: string;
  timestamp: number;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

export interface ChartData {
  points: ChartPoint[];
  range: string;
  symbol: string;
  min: number;
  max: number;
  change: number;
  changePct: number;
}

async function searchNaverMulti(name: string): Promise<StockSearchResult[]> {
  try {
    const res = await fetch(
      `https://ac.stock.naver.com/ac?target=stock&ie=utf8&count=10&q=${encodeURIComponent(name)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    const items = data?.items;
    if (!Array.isArray(items)) return [];
    return items
      .map((it: Record<string, unknown>) => ({
        ticker: String(it.code ?? ""),
        name: String(it.name ?? ""),
        market: String(it.typeName ?? it.typeCode ?? ""),
      }))
      .filter((r: StockSearchResult) => r.ticker && r.name);
  } catch {
    return [];
  }
}

export async function searchStocks(name: string): Promise<StockSearchResult[]> {
  return searchNaverMulti(name);
}

export async function searchStock(name: string): Promise<StockSearchResult | null> {
  const all = await searchNaverMulti(name);
  return all[0] ?? null;
}

function buildSymbols(ticker: string): string[] {
  const isKorean = /^\d+$/.test(ticker);
  if (isKorean) return [`${ticker}.KS`, `${ticker}.KQ`];
  return [ticker];
}

export async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  for (const symbol of buildSymbols(ticker)) {
    const price = await tryYahooCurrent(symbol);
    if (price !== null) return price;
  }
  return null;
}

async function tryYahooCurrent(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price != null) return price;
  } catch {}
  return null;
}

interface RangeConfig {
  interval: string;
  includeExtended: boolean;
}

const RANGE_CONFIG: Record<string, RangeConfig> = {
  "1d": { interval: "5m", includeExtended: true },
  "5d": { interval: "30m", includeExtended: true },
  "1mo": { interval: "1d", includeExtended: false },
  "3mo": { interval: "1d", includeExtended: false },
  "6mo": { interval: "1d", includeExtended: false },
  "1y": { interval: "1d", includeExtended: false },
  "2y": { interval: "1wk", includeExtended: false },
  "5y": { interval: "1wk", includeExtended: false },
};

export async function fetchChartData(ticker: string, range: string = "1mo"): Promise<ChartData | null> {
  const safeRange = RANGE_CONFIG[range] ? range : "1mo";
  const config = RANGE_CONFIG[safeRange];

  for (const symbol of buildSymbols(ticker)) {
    const data = await tryYahooChart(symbol, safeRange, config.interval);
    if (data) {
      const points = data.points;
      if (points.length < 2) continue;

      const allValues: number[] = [];
      for (const p of points) {
        allValues.push(p.close);
        if (p.high != null) allValues.push(p.high);
        if (p.low != null) allValues.push(p.low);
      }
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);

      const first = points[0].close;
      const last = points[points.length - 1].close;
      const change = last - first;
      const changePct = first > 0 ? (change / first) * 100 : 0;
      return { points, range: safeRange, symbol, min, max, change, changePct };
    }
  }
  return null;
}

async function tryYahooChart(
  symbol: string,
  range: string,
  interval: string
): Promise<{ points: ChartPoint[] } | null> {
  try {
    const includePrePost = range === "1d" || range === "5d" ? "&includePrePost=true" : "";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}${includePrePost}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes: (number | null)[] = quote.close || [];
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const volumes: (number | null)[] = quote.volume || [];
    if (timestamps.length === 0) return null;

    const points: ChartPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c == null) continue;
      const d = new Date(timestamps[i] * 1000);
      points.push({
        date: d.toISOString().slice(0, 10),
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        timestamp: timestamps[i],
        price: c,
        open: opens[i] ?? null,
        high: highs[i] ?? null,
        low: lows[i] ?? null,
        close: c,
        volume: volumes[i] ?? null,
      });
    }
    if (points.length < 2) return null;
    return { points };
  } catch {
    return null;
  }
}

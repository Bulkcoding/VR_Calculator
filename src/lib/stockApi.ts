export interface StockSearchResult {
  ticker: string;
  name: string;
  market: string;
}

export interface ChartPoint {
  date: string;
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

async function searchNaver(name: string): Promise<StockSearchResult | null> {
  try {
    const res = await fetch(
      `https://ac.stock.naver.com/ac?target=stock&ie=utf8&count=5&q=${encodeURIComponent(name)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    const items = data?.items;
    if (!items || items.length === 0) return null;
    const first = items[0];
    return { ticker: String(first.code), name: String(first.name), market: String(first.typeCode) };
  } catch {
    return null;
  }
}

export async function searchStock(name: string): Promise<StockSearchResult | null> {
  return searchNaver(name);
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

export async function fetchChartData(ticker: string, range: string = "1mo"): Promise<ChartData | null> {
  const validRanges = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];
  const safeRange = validRanges.includes(range) ? range : "1mo";

  for (const symbol of buildSymbols(ticker)) {
    const data = await tryYahooChart(symbol, safeRange);
    if (data) {
      const points = data.points;
      if (points.length < 2) continue;
      const min = Math.min(...points.map((p) => p.price));
      const max = Math.max(...points.map((p) => p.price));
      const first = points[0].price;
      const last = points[points.length - 1].price;
      const change = last - first;
      const changePct = first > 0 ? (change / first) * 100 : 0;
      return { points, range: safeRange, symbol, min, max, change, changePct };
    }
  }
  return null;
}

async function tryYahooChart(symbol: string, range: string): Promise<{ points: ChartPoint[] } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      }
    );
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
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
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

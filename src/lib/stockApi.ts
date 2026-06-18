export interface StockSearchResult {
  ticker: string;
  name: string;
  market: string;
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

export async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  const isKorean = /^\d+$/.test(ticker);

  if (isKorean) {
    const price = await tryYahoo(`${ticker}.KS`);
    if (price !== null) return price;
    const price2 = await tryYahoo(`${ticker}.KQ`);
    if (price2 !== null) return price2;
  }

  const price = await tryYahoo(ticker);
  if (price !== null) return price;

  return null;
}

async function tryYahoo(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price != null) return price;
  } catch {}
  return null;
}

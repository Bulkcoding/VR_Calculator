const NAVER_FINANCE_ORIGIN = "https://finance.naver.com";

export interface NaverGroupStock {
  code: string;
  name: string;
  currentPrice: number;
  changeRate: number;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function textFromHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNumber(value: string): number {
  const parsed = Number(textFromHtml(value).replace(/[,%+\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractTableRows(html: string, className: string): string[] {
  const tablePattern = new RegExp(
    `<table\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/table>`,
    "i"
  );
  const table = html.match(tablePattern)?.[1] ?? "";
  return Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (match) => match[1]);
}

export function extractCells(row: string): string[] {
  return Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (match) => match[1]);
}

export async function fetchNaverHtml(path: string): Promise<string> {
  const response = await fetch(`${NAVER_FINANCE_ORIGIN}${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; VR-Rebalancing/1.0)",
      Referer: `${NAVER_FINANCE_ORIGIN}/`,
    },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Naver Finance request failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new TextDecoder("euc-kr").decode(buffer);
}

export function parseGroupStocks(html: string, limit = 3): NaverGroupStock[] {
  const stocks: NaverGroupStock[] = [];

  for (const row of extractTableRows(html, "type_5")) {
    const stockLink = row.match(/\/item\/main\.naver\?code=([A-Z0-9]+)/i);
    const cells = extractCells(row);
    if (!stockLink || cells.length < 4) continue;
    const dataOffset = cells[1]?.includes("theme_info_area") ? 1 : 0;
    if (cells.length < 4 + dataOffset) continue;

    const name = textFromHtml(cells[0]).replace(/\s*\*$/, "").trim();
    if (!name) continue;

    stocks.push({
      code: stockLink[1],
      name,
      currentPrice: parseNumber(cells[1 + dataOffset]),
      changeRate: parseNumber(cells[3 + dataOffset]),
    });

    if (stocks.length >= limit) break;
  }

  return stocks;
}

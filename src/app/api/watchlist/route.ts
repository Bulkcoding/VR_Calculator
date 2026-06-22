import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCurrentPrice, fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

// 스파크라인용으로 종가 배열을 target 개수로 균등 다운샘플
function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = (arr.length - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

export const maxDuration = 30;
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

// 한국 종목(숫자 티커) → KRW, 그 외 → USD
function currencyForTicker(ticker: string): string {
  return /^\d+$/.test(ticker) ? "KRW" : "USD";
}

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Yahoo에서 1개월 차트를 받아 현재가/등락률/스파크라인을 한 번에 구성.
  // 차트 실패 시 현재가만이라도 조회.
  const withData = await Promise.all(
    items.map(async (it) => {
      try {
        const chart = await fetchChartData(it.ticker, "1mo");
        if (chart && chart.points.length > 1) {
          const closes = chart.points.map((p) => p.close);
          return {
            ...it,
            currentPrice: closes[closes.length - 1],
            changePct: chart.changePct,
            spark: downsample(closes, 16),
          };
        }
      } catch {}
      let currentPrice: number | null = null;
      try { currentPrice = await fetchCurrentPrice(it.ticker); } catch {}
      return { ...it, currentPrice, changePct: null, spark: [] as number[] };
    })
  );

  return NextResponse.json(withData);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { ticker, name, market } = await req.json();
  if (!ticker || !name) {
    return NextResponse.json({ error: "ticker, name required" }, { status: 400 });
  }

  const item = await prisma.watchlistItem.upsert({
    where: { userId_ticker: { userId, ticker: String(ticker) } },
    create: {
      userId,
      ticker: String(ticker),
      name: String(name),
      market: market ? String(market) : null,
      currency: currencyForTicker(String(ticker)),
    },
    update: { name: String(name), market: market ? String(market) : null },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const ticker = req.nextUrl.searchParams.get("ticker");
  const id = req.nextUrl.searchParams.get("id");
  if (!ticker && !id) return NextResponse.json({ error: "ticker or id required" }, { status: 400 });

  await prisma.watchlistItem.deleteMany({
    where: id ? { id, userId } : { userId, ticker: ticker! },
  });
  return NextResponse.json({ ok: true });
}

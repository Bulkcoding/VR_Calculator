import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchStock, fetchCurrentPrice, fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

// 스파크라인용으로 종가 배열을 target 개수로 균등 다운샘플
function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = (arr.length - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

export async function GET() {
  const userId = await requireUserId();
  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { vrStrategies: true },
  });

  // 종목별 실제 차트(1개월)로 스파크라인 구성. 차트 실패 시 빈 배열.
  const withSpark = await Promise.all(
    holdings.map(async (h) => {
      let spark: number[] = [];
      try {
        const chart = await fetchChartData(h.ticker, "1mo");
        if (chart && chart.points.length > 1) {
          spark = downsample(chart.points.map((p) => p.close), 16);
        }
      } catch {}
      return { ...h, spark };
    })
  );

  return NextResponse.json(withSpark);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();
  const { name, quantity, avgPrice, currency, broker } = body;

  let ticker = body.ticker || "";
  let currentPrice: number | null = null;
  let market: string | null = null;

  if (!ticker && name) {
    const result = await searchStock(name);
    if (result) {
      ticker = result.ticker;
      market = result.market;
      currentPrice = await fetchCurrentPrice(result.ticker);
    }
  }

  const holding = await prisma.holding.create({
    data: {
      userId,
      ticker: ticker || name,
      name,
      quantity,
      avgPrice,
      currentPrice,
      currency: currency || "KRW",
      market,
      broker: broker || "manual",
    },
  });
  return NextResponse.json(holding, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const holding = await prisma.holding.update({
    where: { id },
    data: {
      name: body.name,
      quantity: body.quantity,
      avgPrice: body.avgPrice,
      currency: body.currency,
      broker: body.broker,
    },
  });
  return NextResponse.json(holding);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

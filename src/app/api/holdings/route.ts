import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchStock, fetchCurrentPrice } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

// 현재가는 DB값을 그대로 반환(가벼움). 시세 갱신은 /api/holdings/refresh,
// 차트(스파크라인)는 /api/holdings/sparklines 로 분리되어 있다.
export async function GET() {
  const userId = await requireUserId();
  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { vrStrategies: true },
  });
  return NextResponse.json(holdings);
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

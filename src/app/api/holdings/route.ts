import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchStock, fetchCurrentPrice } from "@/lib/stockApi";

const DEFAULT_USER_ID = "default";

async function ensureDefaultUser() {
  const user = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
  if (!user) {
    return prisma.user.create({
      data: { id: DEFAULT_USER_ID, email: "default@local.dev" },
    });
  }
  return user;
}

export async function GET() {
  await ensureDefaultUser();
  const holdings = await prisma.holding.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { updatedAt: "desc" },
    include: { vrStrategies: true },
  });
  return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
  await ensureDefaultUser();
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
      userId: DEFAULT_USER_ID,
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

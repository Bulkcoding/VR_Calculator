import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCurrentPrice } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

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

  // 현재가는 Yahoo에서 실시간 조회
  const withPrice = await Promise.all(
    items.map(async (it) => {
      let currentPrice: number | null = null;
      try { currentPrice = await fetchCurrentPrice(it.ticker); } catch {}
      return { ...it, currentPrice };
    })
  );

  return NextResponse.json(withPrice);
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

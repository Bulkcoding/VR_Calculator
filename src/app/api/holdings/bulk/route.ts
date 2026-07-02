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

interface BulkHoldingInput {
  name: string;
  ticker?: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number | null;
  currency?: string;
  market?: string | null;
  broker?: string;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNumber(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();
  const holdings = Array.isArray(body?.holdings) ? (body.holdings as BulkHoldingInput[]) : null;

  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ error: "holdings required" }, { status: 400 });
  }

  let added = 0;
  let updated = 0;

  for (const item of holdings) {
    const name = normalizeText(item.name);
    if (!name) continue;

    const quantity = normalizeNumber(item.quantity);
    const avgPrice = normalizeNumber(item.avgPrice);
    if (quantity == null || avgPrice == null || quantity <= 0 || avgPrice < 0) continue;

    let ticker = normalizeText(item.ticker);
    let market = normalizeText(item.market) || null;
    let currentPrice = normalizeNumber(item.currentPrice);
    const currency = normalizeText(item.currency || "KRW").toUpperCase() || "KRW";
    const broker = normalizeText(item.broker || "manual");

    if (!ticker || !market || currentPrice == null) {
      const result = await searchStock(name);
      if (result) {
        if (!ticker) ticker = result.ticker;
        if (!market) market = result.market;
        if (currentPrice == null) currentPrice = await fetchCurrentPrice(result.ticker);
      }
    }

    if (currentPrice == null && ticker) {
      currentPrice = await fetchCurrentPrice(ticker);
    }

    const uniqueTicker = ticker || name;
    const existing = await prisma.holding.findUnique({
      where: { userId_ticker: { userId, ticker: uniqueTicker } },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          name,
          ticker: uniqueTicker,
          quantity,
          avgPrice,
          currentPrice,
          currency,
          market,
          broker,
        },
      });
      updated++;
    } else {
      await prisma.holding.create({
        data: {
          userId,
          name,
          ticker: uniqueTicker,
          quantity,
          avgPrice,
          currentPrice,
          currency,
          market,
          broker,
        },
      });
      added++;
    }
  }

  return NextResponse.json({ ok: true, added, updated });
}

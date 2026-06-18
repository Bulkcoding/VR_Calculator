import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCurrentPrice } from "@/lib/stockApi";

const DEFAULT_USER_ID = "default";

export async function POST() {
  const holdings = await prisma.holding.findMany({
    where: { userId: DEFAULT_USER_ID },
    select: { id: true, ticker: true, market: true },
  });

  await Promise.all(
    holdings.map(async (h) => {
      const price = await fetchCurrentPrice(h.ticker);
      if (price !== null) {
        await prisma.holding.update({
          where: { id: h.id },
          data: { currentPrice: price },
        });
      }
    })
  );

  return NextResponse.json({ ok: true });
}

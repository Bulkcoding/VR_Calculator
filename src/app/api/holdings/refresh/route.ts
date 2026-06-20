import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCurrentPrice } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const maxDuration = 30;

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function POST() {
  const userId = await requireUserId();

  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { id: true, ticker: true, market: true },
  });

  const results = await Promise.allSettled(
    holdings.map(async (h) => {
      try {
        const price = await fetchCurrentPrice(h.ticker);
        if (price !== null) {
          await prisma.holding.update({
            where: { id: h.id },
            data: { currentPrice: price },
          });
          return { id: h.id, ok: true };
        }
        return { id: h.id, ok: false, reason: "no price" };
      } catch (e) {
        return { id: h.id, ok: false, reason: e instanceof Error ? e.message : "unknown" };
      }
    })
  );

  const ok = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
  const failed = results.length - ok;

  return NextResponse.json({ ok: true, refreshed: ok, failed, total: results.length });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchTossHoldings } from "@/lib/tossApi";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function POST() {
  const userId = await requireUserId();

  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker: "toss" } },
  });
  if (!cred) {
    return NextResponse.json({ error: "Toss credentials not found" }, { status: 400 });
  }

  let parsed: { appKey: string; appSecret: string };
  try {
    parsed = JSON.parse(decrypt(cred.encryptedKey));
  } catch {
    return NextResponse.json({ error: "Failed to decrypt credentials" }, { status: 500 });
  }

  let result: Awaited<ReturnType<typeof fetchTossHoldings>>;
  try {
    result = await fetchTossHoldings(parsed.appKey, parsed.appSecret);
  } catch (e: any) {
    return NextResponse.json({ error: `Toss API error: ${e.message}` }, { status: 502 });
  }

  let added = 0;
  let updated = 0;

  for (const h of result.holdings) {
    const existing = await prisma.holding.findUnique({
      where: { userId_ticker: { userId, ticker: h.ticker } },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
          name: h.name,
          currency: h.currency,
          broker: "toss",
        },
      });
      updated++;
    } else {
      await prisma.holding.create({
        data: {
          userId,
          ticker: h.ticker,
          name: h.name,
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
          currency: h.currency,
          broker: "toss",
        },
      });
      added++;
    }
  }

  return NextResponse.json({ ok: true, added, updated });
}

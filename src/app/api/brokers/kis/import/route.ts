import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchKisHoldings } from "@/lib/kisApi";

const DEFAULT_USER_ID = "default";

export async function POST() {
  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId: DEFAULT_USER_ID, broker: "kis" } },
  });

  if (!cred) {
    return NextResponse.json({ error: "KIS credentials not found" }, { status: 400 });
  }

  let parsed: { appKey: string; appSecret: string; accNo: string };
  try {
    parsed = JSON.parse(decrypt(cred.encryptedKey));
  } catch {
    return NextResponse.json({ error: "Failed to decrypt credentials" }, { status: 500 });
  }

  let result: Awaited<ReturnType<typeof fetchKisHoldings>>;
  try {
    result = await fetchKisHoldings(parsed.appKey, parsed.appSecret, parsed.accNo);
  } catch (e: any) {
    return NextResponse.json({ error: `KIS API error: ${e.message}` }, { status: 502 });
  }

  let added = 0;
  let updated = 0;

  for (const h of result.holdings) {
    const existing = await prisma.holding.findUnique({
      where: { userId_ticker: { userId: DEFAULT_USER_ID, ticker: h.ticker } },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
          name: h.name,
          broker: "kis",
        },
      });
      updated++;
    } else {
      await prisma.holding.create({
        data: {
          userId: DEFAULT_USER_ID,
          ticker: h.ticker,
          name: h.name,
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
          currency: "KRW",
          broker: "kis",
        },
      });
      added++;
    }
  }

  return NextResponse.json({ ok: true, added, updated, accountSummary: result.accountSummary });
}

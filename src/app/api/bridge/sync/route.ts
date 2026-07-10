import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBrokerLabel } from "@/lib/brokers";
import { verifySyncToken } from "@/lib/syncBridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BridgeHolding = {
  ticker?: unknown;
  symbol?: unknown;
  name?: unknown;
  quantity?: unknown;
  avgPrice?: unknown;
  avg_price?: unknown;
  currentPrice?: unknown;
  current_price?: unknown;
  currency?: unknown;
  market?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function maskAccountNo(value: unknown) {
  const raw = asString(value).replace(/[^0-9A-Za-z]/g, "");
  if (!raw) return null;
  return `**${raw.slice(-4)}`;
}

async function findAuthorizedRequest(requestId: unknown, token: unknown) {
  const id = asString(requestId);
  const rawToken = asString(token);
  if (!id || !rawToken) return null;

  const syncRequest = await prisma.syncRequest.findUnique({ where: { id } });
  if (!syncRequest) return null;
  if (syncRequest.bridgeTokenExpiresAt.getTime() < Date.now()) return null;
  if (!verifySyncToken(rawToken, syncRequest.bridgeTokenHash)) return null;

  return syncRequest;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const syncRequest = await findAuthorizedRequest(body.requestId, body.token);
  if (!syncRequest) {
    return NextResponse.json({ error: "Invalid or expired sync request" }, { status: 401 });
  }

  const status = asString(body.status);
  const now = new Date();

  if (status === "started" || status === "running") {
    const updated = await prisma.syncRequest.update({
      where: { id: syncRequest.id },
      data: { status: "running", startedAt: syncRequest.startedAt ?? now },
      select: { id: true, status: true, startedAt: true },
    });
    return NextResponse.json({ ok: true, syncRequest: updated });
  }

  if (status === "failed") {
    const updated = await prisma.syncRequest.update({
      where: { id: syncRequest.id },
      data: {
        status: "failed",
        completedAt: now,
        errorMessage: asString(body.errorMessage) || "Sync Bridge failed",
      },
      select: { id: true, status: true, completedAt: true, errorMessage: true },
    });
    return NextResponse.json({ ok: false, syncRequest: updated });
  }

  const broker = asString(body.broker) || syncRequest.broker || "local";
  const holdings = Array.isArray(body.holdings) ? body.holdings as BridgeHolding[] : [];
  if (holdings.length === 0) {
    return NextResponse.json({ error: "holdings array required" }, { status: 400 });
  }

  let added = 0;
  let updated = 0;

  for (const item of holdings) {
    const ticker = (asString(item.ticker) || asString(item.symbol)).toUpperCase();
    const name = asString(item.name) || ticker;
    const quantity = asNumber(item.quantity);
    const avgPrice = asNumber(item.avgPrice ?? item.avg_price);
    const currentPrice = asNumber(item.currentPrice ?? item.current_price);
    const currency = asString(item.currency).toUpperCase() || "KRW";
    const market = asString(item.market) || null;

    if (!ticker || quantity == null || avgPrice == null) continue;

    const existing = await prisma.holding.findUnique({
      where: { userId_ticker: { userId: syncRequest.userId, ticker } },
      select: { id: true },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          name,
          quantity,
          avgPrice,
          currentPrice,
          currency,
          market,
          broker,
        },
      });
      updated += 1;
    } else {
      await prisma.holding.create({
        data: {
          userId: syncRequest.userId,
          ticker,
          name,
          quantity,
          avgPrice,
          currentPrice,
          currency,
          market,
          broker,
        },
      });
      added += 1;
    }
  }

  const accountNoMasked = asString(body.accountNoMasked) || maskAccountNo(body.accountNo);

  await prisma.brokerConnection.upsert({
    where: { userId_broker: { userId: syncRequest.userId, broker } },
    create: {
      userId: syncRequest.userId,
      broker,
      accountNoMasked,
      status: "connected",
      lastSyncedAt: now,
    },
    update: {
      accountNoMasked,
      status: "connected",
      lastSyncedAt: now,
    },
  });

  const completed = await prisma.syncRequest.update({
    where: { id: syncRequest.id },
    data: {
      broker,
      status: "completed",
      startedAt: syncRequest.startedAt ?? now,
      completedAt: now,
      errorMessage: null,
    },
    select: {
      id: true,
      broker: true,
      status: true,
      requestedAt: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  return NextResponse.json({
    ok: true,
    added,
    updated,
    brokerLabel: getBrokerLabel(broker),
    syncRequest: completed,
  });
}


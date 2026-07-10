import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBridgeBrokerId } from "@/lib/brokers";
import { getUserId } from "@/lib/getUserId";
import { createSyncExpiresAt, createSyncToken, hashSyncToken } from "@/lib/syncBridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireUserId() {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

function getOrigin(req: NextRequest) {
  return req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

function toDeepLink({
  origin,
  requestId,
  token,
  broker,
}: {
  origin: string;
  requestId: string;
  token: string;
  broker?: string | null;
}) {
  const params = new URLSearchParams({
    requestId,
    token,
    callbackUrl: `${origin}/api/bridge/sync`,
  });

  if (broker) params.set("broker", broker);
  return `revalue://sync?${params.toString()}`;
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const syncRequest = await prisma.syncRequest.findFirst({
      where: { id, userId },
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

    if (!syncRequest) {
      return NextResponse.json({ error: "Sync request not found" }, { status: 404 });
    }

    return NextResponse.json(syncRequest);
  }

  const recent = await prisma.syncRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    take: 10,
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

  return NextResponse.json(recent);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const broker = typeof body.broker === "string" && isBridgeBrokerId(body.broker) ? body.broker : null;
  const token = createSyncToken();
  const expiresAt = createSyncExpiresAt();

  const syncRequest = await prisma.syncRequest.create({
    data: {
      userId,
      broker,
      status: "requested",
      bridgeTokenHash: hashSyncToken(token),
      bridgeTokenExpiresAt: expiresAt,
    },
    select: {
      id: true,
      broker: true,
      status: true,
      requestedAt: true,
      bridgeTokenExpiresAt: true,
    },
  });

  const origin = getOrigin(req);

  return NextResponse.json({
    id: syncRequest.id,
    broker: syncRequest.broker,
    status: syncRequest.status,
    requestedAt: syncRequest.requestedAt,
    expiresAt: syncRequest.bridgeTokenExpiresAt,
    deepLink: toDeepLink({ origin, requestId: syncRequest.id, token, broker }),
  }, { status: 201 });
}


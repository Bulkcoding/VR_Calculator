import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";
import { decrypt } from "@/lib/crypto";
import { getBrokerLabel } from "@/lib/brokers";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json([]);

  const [connections, creds] = await Promise.all([
    prisma.brokerConnection.findMany({
      where: { userId },
      select: {
        broker: true,
        accountNoMasked: true,
        status: true,
        connectedAt: true,
        lastSyncedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.brokerCredential.findMany({
      where: { userId },
      select: { broker: true, label: true, encryptedKey: true },
    }),
  ]);

  const merged = new Map<string, {
    broker: string;
    label: string | null;
    maskedAccNo: string;
    status: string;
    connectedAt: Date | null;
    lastSyncedAt: Date | null;
    source: "bridge" | "server";
  }>();

  for (const connection of connections) {
    merged.set(connection.broker, {
      broker: connection.broker,
      label: getBrokerLabel(connection.broker),
      maskedAccNo: connection.accountNoMasked || "**",
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastSyncedAt: connection.lastSyncedAt,
      source: "bridge",
    });
  }

  for (const c of creds) {
    if (merged.has(c.broker)) continue;
    let accNo = "";
    try {
      const d = JSON.parse(decrypt(c.encryptedKey));
      accNo = d.accNo || "";
    } catch {}
    const masked = accNo.length >= 4 ? "**" + accNo.replace(/-/g, "").slice(-4) : "**";
    merged.set(c.broker, {
      broker: c.broker,
      label: c.label || getBrokerLabel(c.broker),
      maskedAccNo: masked,
      status: "connected",
      connectedAt: null,
      lastSyncedAt: null,
      source: "server",
    });
  }

  return NextResponse.json(Array.from(merged.values()));
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { getBrokerLabel } from "@/lib/brokers";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ hasCredentials: false });
  }

  const broker = req.nextUrl.searchParams.get("broker");
  if (!broker) return NextResponse.json({ error: "broker required" }, { status: 400 });

  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker } },
  });
  if (!cred) return NextResponse.json({ hasCredentials: false });

  let decrypted: { appKey: string; appSecret: string; accNo: string } | null = null;
  try {
    decrypted = JSON.parse(decrypt(cred.encryptedKey));
  } catch {}

  if (!decrypted) {
    return NextResponse.json({ hasCredentials: true, needsReauth: true, appKey: "", accNo: "" });
  }

  return NextResponse.json({
    hasCredentials: true,
    appKey: decrypted.appKey || "",
    accNo: decrypted.accNo || "",
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { broker, appKey, appSecret, accNo } = await req.json();
  if (!broker || !appKey || !accNo) {
    return NextResponse.json({ error: "broker, appKey, accNo required" }, { status: 400 });
  }

  let finalSecret = appSecret as string;
  if (!finalSecret) {
    const existing = await prisma.brokerCredential.findUnique({ where: { userId_broker: { userId, broker } } });
    if (existing) {
      try {
        finalSecret = JSON.parse(decrypt(existing.encryptedKey)).appSecret || "";
      } catch {}
    }
    if (!finalSecret) {
      return NextResponse.json({ error: "AppSecret required" }, { status: 400 });
    }
  }

  const encrypted = encrypt(JSON.stringify({ appKey, appSecret: finalSecret, accNo }));
  const label = getBrokerLabel(broker);

  await prisma.brokerCredential.upsert({
    where: { userId_broker: { userId, broker } },
    create: { userId, broker, encryptedKey: encrypted, label },
    update: { encryptedKey: encrypted, label },
  });

  return NextResponse.json({ ok: true });
}
export async function DELETE(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const broker = req.nextUrl.searchParams.get("broker");
  if (!broker) return NextResponse.json({ error: "broker required" }, { status: 400 });

  await Promise.all([
    prisma.brokerCredential.deleteMany({ where: { userId, broker } }),
    prisma.brokerConnection.deleteMany({ where: { userId, broker } }),
  ]);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function GET() {
  const userId = await requireUserId();
  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker: "kis" } },
  });
  if (!cred) return NextResponse.json({ hasCredentials: false });

  let decrypted = { appKey: "", appSecret: "", accNo: "" };
  try {
    decrypted = JSON.parse(decrypt(cred.encryptedKey));
  } catch {}

  return NextResponse.json({
    hasCredentials: true,
    appKey: decrypted.appKey,
    accNo: decrypted.accNo,
    hasSecret: !!decrypted.appSecret,
  });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();
  const { appKey, appSecret, accNo } = body;

  if (!appKey || !appSecret || !accNo) {
    return NextResponse.json({ error: "appKey, appSecret, accNo required" }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify({ appKey, appSecret, accNo }));

  await prisma.brokerCredential.upsert({
    where: { userId_broker: { userId, broker: "kis" } },
    create: { userId, broker: "kis", encryptedKey: encrypted, label: "KIS" },
    update: { encryptedKey: encrypted, label: "KIS" },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await requireUserId();
  await prisma.brokerCredential.deleteMany({
    where: { userId, broker: "kis" },
  });
  return NextResponse.json({ ok: true });
}

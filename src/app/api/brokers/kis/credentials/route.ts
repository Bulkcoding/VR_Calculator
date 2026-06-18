import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

const DEFAULT_USER_ID = "default";

export async function GET() {
  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId: DEFAULT_USER_ID, broker: "kis" } },
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
  const body = await req.json();
  const { appKey, appSecret, accNo } = body;

  if (!appKey || !appSecret || !accNo) {
    return NextResponse.json({ error: "appKey, appSecret, accNo required" }, { status: 400 });
  }

  const encrypted = encrypt(JSON.stringify({ appKey, appSecret, accNo }));

  await prisma.brokerCredential.upsert({
    where: { userId_broker: { userId: DEFAULT_USER_ID, broker: "kis" } },
    create: {
      userId: DEFAULT_USER_ID,
      broker: "kis",
      encryptedKey: encrypted,
      label: "KIS",
    },
    update: { encryptedKey: encrypted, label: "KIS" },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.brokerCredential.deleteMany({
    where: { userId: DEFAULT_USER_ID, broker: "kis" },
  });
  return NextResponse.json({ ok: true });
}

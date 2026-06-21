import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ hasCredentials: false }); }

  const broker = req.nextUrl.searchParams.get("broker");
  if (!broker) return NextResponse.json({ error: "broker required" }, { status: 400 });

  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker } },
  });
  if (!cred) return NextResponse.json({ hasCredentials: false });

  let decrypted = { appKey: "", appSecret: "", accNo: "" };
  try { decrypted = JSON.parse(decrypt(cred.encryptedKey)); } catch {}

  return NextResponse.json({ hasCredentials: true, appKey: decrypted.appKey, accNo: decrypted.accNo });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { broker, appKey, appSecret, accNo } = await req.json();
  if (!broker || !appKey || !accNo) {
    return NextResponse.json({ error: "broker, appKey, accNo required" }, { status: 400 });
  }

  let finalSecret = appSecret as string;
  if (!finalSecret) {
    const existing = await prisma.brokerCredential.findUnique({ where: { userId_broker: { userId, broker } } });
    if (existing) {
      try { finalSecret = JSON.parse(decrypt(existing.encryptedKey)).appSecret || ""; } catch {}
    }
    if (!finalSecret) {
      return NextResponse.json({ error: "AppSecret required" }, { status: 400 });
    }
  }

  const LABELS: Record<string, string> = {
    kis: "한국투자증권", toss: "토스증권", samsung: "삼성증권", kb: "KB증권",
    mirae: "미래에셋증권", nh: "NH투자증권", shinhan: "신한투자증권",
    hana: "하나증권", daishin: "대신증권", yuanta: "유안타증권",
    eugene: "유진투자증권",
  };

  const encrypted = encrypt(JSON.stringify({ appKey, appSecret: finalSecret, accNo }));
  await prisma.brokerCredential.upsert({
    where: { userId_broker: { userId, broker } },
    create: { userId, broker, encryptedKey: encrypted, label: LABELS[broker] || broker },
    update: { encryptedKey: encrypted, label: LABELS[broker] || broker },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const broker = req.nextUrl.searchParams.get("broker");
  if (!broker) return NextResponse.json({ error: "broker required" }, { status: 400 });

  await prisma.brokerCredential.deleteMany({ where: { userId, broker } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json([]);

  const creds = await prisma.brokerCredential.findMany({
    where: { userId },
    select: { broker: true, label: true, encryptedKey: true },
  });

  const result = creds.map((c) => {
    let accNo = "";
    try {
      const d = JSON.parse(decrypt(c.encryptedKey));
      accNo = d.accNo || "";
    } catch {}
    const masked = accNo.length >= 4 ? "**" + accNo.replace(/-/g, "").slice(-4) : "**";
    return { broker: c.broker, label: c.label, maskedAccNo: masked };
  });

  return NextResponse.json(result);
}

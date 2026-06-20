import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isDisposableEmail, COMMON_PROVIDERS_AUTO_ALLOW } from "@/lib/disposableEmail";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name } = body;

  if (!email || !password || password.length < 4) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Allow common providers without checking the disposable list
  if (!COMMON_PROVIDERS_AUTO_ALLOW.has(domain) && isDisposableEmail(email)) {
    return NextResponse.json({
      error: "일회용 이메일은 사용할 수 없습니다. Gmail, 네이버, 다음 등 정상적인 이메일을 사용해주세요.",
    }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name: name || null },
  });

  // Migrate data from default user if it exists
  const defaultUser = await prisma.user.findUnique({ where: { id: "default" } });
  if (defaultUser) {
    await prisma.holding.updateMany({
      where: { userId: "default" },
      data: { userId: user.id },
    });
    await prisma.vrStrategy.updateMany({
      where: { userId: "default" },
      data: { userId: user.id },
    });
    await prisma.brokerCredential.updateMany({
      where: { userId: "default" },
      data: { userId: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}

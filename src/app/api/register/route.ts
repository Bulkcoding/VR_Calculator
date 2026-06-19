import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name } = body;

  if (!email || !password || password.length < 4) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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

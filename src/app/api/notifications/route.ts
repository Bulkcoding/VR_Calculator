import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";

export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { type, title, message, holdingId, cycleId } = body;
    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title, message required" }, { status: 400 });
    }
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, holdingId, cycleId },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const ids = body.ids ?? [];
    if (ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId },
        data: { read: true },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 });
  }
}

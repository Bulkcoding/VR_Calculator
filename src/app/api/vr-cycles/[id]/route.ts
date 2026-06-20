import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";
import { calculateVr } from "@/lib/vr";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cycles = await prisma.vrCycle.findMany({
    where: { holdingId: id },
    orderBy: { cycleNumber: "desc" },
  });
  return NextResponse.json(cycles);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json();

  const { vValue, bandPct, divisorG, contribution, pool, currentQty } = body;
  const result = calculateVr({ vValue, bandPct, divisorG, contribution, pool, currentQty });

  const lastCycle = await prisma.vrCycle.findFirst({
    where: { holdingId: id },
    orderBy: { cycleNumber: "desc" },
  });
  const nextNumber = (lastCycle?.cycleNumber ?? 0) + 1;

  const cycle = await prisma.vrCycle.create({
    data: {
      holdingId: id,
      cycleNumber: nextNumber,
      vValue,
      bandPct,
      divisorG,
      contribution,
      pool,
      currentQty,
      minBand: result.minBand,
      maxBand: result.maxBand,
    },
  });

  return NextResponse.json(cycle, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ error: "cycleId required" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes;
  }
  if (body.vValue !== undefined) data.vValue = body.vValue;
  if (body.bandPct !== undefined) data.bandPct = body.bandPct;
  if (body.divisorG !== undefined) data.divisorG = body.divisorG;
  if (body.contribution !== undefined) data.contribution = body.contribution;
  if (body.pool !== undefined) data.pool = body.pool;
  if (body.currentQty !== undefined) data.currentQty = body.currentQty;
  if (body.minBand !== undefined) data.minBand = body.minBand;
  if (body.maxBand !== undefined) data.maxBand = body.maxBand;

  const cycle = await prisma.vrCycle.update({
    where: { id: cycleId, holdingId: id },
    data,
  });
  return NextResponse.json(cycle);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(_req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ error: "cycleId required" }, { status: 400 });

  await prisma.vrCycle.delete({
    where: { id: cycleId, holdingId: id },
  });
  return NextResponse.json({ ok: true });
}

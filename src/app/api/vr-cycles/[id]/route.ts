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
  const cycle = await prisma.vrCycle.update({
    where: { id: cycleId, holdingId: id },
    data: {
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      notes: body.notes,
    },
  });
  return NextResponse.json(cycle);
}

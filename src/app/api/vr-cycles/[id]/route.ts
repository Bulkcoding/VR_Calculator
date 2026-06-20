import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";
import { calculateVr, nextVValue, PRESET_TO_PCT, type BandPreset, type VrMode } from "@/lib/vr";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

function safeMode(v: unknown): VrMode {
  return v === "contribution" || v === "withdrawal" ? v : "lump";
}
function safePreset(v: unknown): BandPreset {
  const n = Number(v);
  return ([10, 15, 20] as BandPreset[]).includes(n as BandPreset) ? (n as BandPreset) : 15;
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

  const mode = safeMode(body.mode);
  const bandPreset = safePreset(body.bandPreset);
  const bandPct = PRESET_TO_PCT[bandPreset];
  const divisorG = Math.max(1, Math.floor(Number(body.divisorG) || 10));
  const contribution = Number(body.contribution) || 0;
  const withdrawal = Number(body.withdrawal) || 0;
  const tradeUnit = Math.max(1, Math.floor(Number(body.tradeUnit) || 1));
  const advanced = Boolean(body.advanced);
  const startPool = Number(body.pool) || 0;
  const startQty = Number(body.currentQty) || 0;
  const startPrice = Number(body.startPrice) || Number(body.currentPrice) || 0;
  const endPrice = Number(body.endPrice) || Number(body.currentPrice) || startPrice;
  const endQty = Number(body.endQty) ?? startQty;
  const endPool = Number(body.endPool) ?? startPool;
  const cycleDays = Math.max(1, Number(body.cycleDays) || 14);
  const endDateInput = body.endDate ? new Date(body.endDate) : new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000);
  const endEval = endQty * endPrice;

  const lastCycle = await prisma.vrCycle.findFirst({
    where: { holdingId: id },
    orderBy: { cycleNumber: "desc" },
  });

  const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;
  const prevEndEval = lastCycle?.endEval ?? null;

  let vValue: number;
  let startEval: number;
  if (cycleNumber === 1) {
    vValue = startQty * startPrice;
    startEval = vValue;
  } else {
    startEval = prevEndEval ?? startQty * startPrice;
    vValue = nextVValue(startEval, startPool, divisorG, contribution, withdrawal, mode, advanced, endEval);
  }

  const result = calculateVr({
    vValue, bandPreset, bandPct, divisorG, contribution, withdrawal,
    pool: startPool, currentQty: startQty, mode, tradeUnit, advanced,
  });

  const cycle = await prisma.vrCycle.create({
    data: {
      holdingId: id,
      cycleNumber,
      mode,
      vValue,
      bandPreset,
      bandPct,
      divisorG,
      contribution,
      withdrawal,
      tradeUnit,
      advanced,
      startPool,
      endPool,
      startEval,
      endEval,
      startQty,
      endQty,
      startPrice,
      endPrice,
      minBand: result.minBand,
      maxBand: result.maxBand,
    },
  });

  await prisma.vrStrategy.update({
    where: { holdingId: id },
    data: {
      vValue: result.buyTable.length === 0 && result.sellTable.length === 0 ? vValue : vValue,
      bandPreset, bandPct, divisorG, contribution, withdrawal,
      pool: endPool, currentQty: endQty, mode, tradeUnit, advanced,
    },
  }).catch(() => null);

  return NextResponse.json(cycle, { status: 201 });
}

function endEvalForCalc(body: Record<string, unknown>, endQty: number, endPrice: number, startQty: number) {
  if (body.endEval !== undefined) return Number(body.endEval);
  const q = Number(body.endQty ?? startQty);
  const p = Number(body.endPrice ?? body.currentPrice ?? 0);
  return q * p;
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

  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.vValue !== undefined) data.vValue = body.vValue;
  if (body.bandPreset !== undefined) {
    const p = safePreset(body.bandPreset);
    data.bandPreset = p;
    data.bandPct = PRESET_TO_PCT[p];
  }
  if (body.bandPct !== undefined) data.bandPct = body.bandPct;
  if (body.divisorG !== undefined) data.divisorG = Math.max(1, Math.floor(Number(body.divisorG)));
  if (body.contribution !== undefined) data.contribution = Number(body.contribution);
  if (body.withdrawal !== undefined) data.withdrawal = Number(body.withdrawal);
  if (body.tradeUnit !== undefined) data.tradeUnit = Math.max(1, Math.floor(Number(body.tradeUnit)));
  if (body.startPool !== undefined) data.startPool = Number(body.startPool);
  if (body.endPool !== undefined) data.endPool = Number(body.endPool);
  if (body.startEval !== undefined) data.startEval = Number(body.startEval);
  if (body.endEval !== undefined) {
    const v = Number(body.endEval);
    data.endEval = v;
    const currentCycle = await prisma.vrCycle.findUnique({ where: { id: cycleId } });
    if (currentCycle && body.recalcV !== false) {
      const v2 = nextVValue(
        currentCycle.startEval ?? v,
        currentCycle.startPool ?? 0,
        currentCycle.divisorG,
        currentCycle.contribution,
        currentCycle.withdrawal,
        (currentCycle.mode as VrMode) || "lump",
        currentCycle.advanced,
        v,
      );
      data.vValue = v2;
    }
  }
  if (body.startQty !== undefined) data.startQty = Number(body.startQty);
  if (body.endQty !== undefined) {
    data.endQty = Number(body.endQty);
    const currentCycle = await prisma.vrCycle.findUnique({ where: { id: cycleId } });
    if (currentCycle) {
      data.endEval = Number(body.endQty) * (currentCycle.endPrice ?? 0);
    }
  }
  if (body.startPrice !== undefined) data.startPrice = Number(body.startPrice);
  if (body.endPrice !== undefined) {
    data.endPrice = Number(body.endPrice);
    const currentCycle = await prisma.vrCycle.findUnique({ where: { id: cycleId } });
    if (currentCycle) {
      data.endEval = (currentCycle.endQty ?? 0) * Number(body.endPrice);
    }
  }
  if (body.mode !== undefined) data.mode = safeMode(body.mode);
  if (body.advanced !== undefined) data.advanced = Boolean(body.advanced);

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

  await prisma.vrCycle.delete({ where: { id: cycleId, holdingId: id } });
  return NextResponse.json({ ok: true });
}

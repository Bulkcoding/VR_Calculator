import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUserId";
import { PRESET_TO_PCT, type BandPreset, type VrMode } from "@/lib/vr";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

function normalizeBody(body: Record<string, unknown>) {
  const bandPreset = (Number(body.bandPreset) || 15) as BandPreset;
  const safePreset: BandPreset = ([10, 15, 20] as BandPreset[]).includes(bandPreset) ? bandPreset : 15;
  const bandPct = typeof body.bandPct === "number" ? body.bandPct : PRESET_TO_PCT[safePreset];
  const mode: VrMode = body.mode === "contribution" || body.mode === "withdrawal" ? body.mode : "lump";

  return {
    vValue: Number(body.vValue) || 0,
    bandPreset: safePreset,
    bandPct,
    divisorG: Math.max(1, Math.floor(Number(body.divisorG) || 10)),
    contribution: Number(body.contribution) || 0,
    withdrawal: Number(body.withdrawal) || 0,
    pool: Number(body.pool) || 0,
    currentQty: Number(body.currentQty) || 0,
    mode,
    tradeUnit: Math.max(1, Math.floor(Number(body.tradeUnit) || 1)),
    advanced: Boolean(body.advanced),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const strategy = await prisma.vrStrategy.findUnique({ where: { holdingId: id } });
  return NextResponse.json(strategy);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json();
  const data = normalizeBody(body);

  const strategy = await prisma.vrStrategy.upsert({
    where: { holdingId: id },
    create: { holdingId: id, userId, ...data },
    update: data,
  });

  return NextResponse.json(strategy);
}

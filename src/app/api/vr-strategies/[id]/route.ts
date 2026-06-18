import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "default";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const strategy = await prisma.vrStrategy.findUnique({
    where: { holdingId: id },
  });
  return NextResponse.json(strategy);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const strategy = await prisma.vrStrategy.upsert({
    where: { holdingId: id },
    create: {
      holdingId: id,
      userId: DEFAULT_USER_ID,
      vValue: body.vValue,
      bandPct: body.bandPct,
      divisorG: body.divisorG,
      contribution: body.contribution,
      pool: body.pool,
      currentQty: body.currentQty,
    },
    update: {
      vValue: body.vValue,
      bandPct: body.bandPct,
      divisorG: body.divisorG,
      contribution: body.contribution,
      pool: body.pool,
      currentQty: body.currentQty,
    },
  });

  return NextResponse.json(strategy);
}

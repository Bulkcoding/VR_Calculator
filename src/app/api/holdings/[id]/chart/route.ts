import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") || "1mo";

  const holding = await prisma.holding.findFirst({
    where: { id, userId },
    select: { ticker: true, market: true, name: true },
  });
  if (!holding) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await fetchChartData(holding.ticker, range);
  if (!data) {
    return NextResponse.json({ error: "차트 데이터를 불러올 수 없습니다." }, { status: 502 });
  }

  return NextResponse.json(data);
}

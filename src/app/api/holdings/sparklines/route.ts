import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// 종가 배열을 target 개수로 균등 다운샘플
function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = (arr.length - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

// 보유종목별 1개월 스파크라인을 { [holdingId]: number[] } 형태로 반환 (차트 전용, 60초 주기)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({}, { status: 401 });

  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { id: true, ticker: true },
  });

  const entries = await Promise.all(
    holdings.map(async (h) => {
      try {
        const chart = await fetchChartData(h.ticker, "1mo");
        if (chart && chart.points.length > 1) {
          return [h.id, downsample(chart.points.map((p) => p.close), 16)] as const;
        }
      } catch {}
      return [h.id, [] as number[]] as const;
    })
  );

  return NextResponse.json(Object.fromEntries(entries));
}

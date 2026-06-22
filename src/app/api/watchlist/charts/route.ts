import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function downsample(arr: number[], target: number): number[] {
  if (arr.length <= target) return arr;
  const step = (arr.length - 1) / (target - 1);
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

// 관심종목별 1개월 등락률/스파크라인을 { [ticker]: { changePct, spark } } 형태로 반환 (차트 전용, 60초)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({}, { status: 401 });

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { ticker: true },
  });

  const entries = await Promise.all(
    items.map(async (it) => {
      try {
        const chart = await fetchChartData(it.ticker, "1mo");
        if (chart && chart.points.length > 1) {
          return [
            it.ticker,
            { changePct: chart.changePct, spark: downsample(chart.points.map((p) => p.close), 16) },
          ] as const;
        }
      } catch {}
      return [it.ticker, { changePct: null, spark: [] as number[] }] as const;
    })
  );

  return NextResponse.json(Object.fromEntries(entries));
}

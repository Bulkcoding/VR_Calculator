import { NextRequest, NextResponse } from "next/server";
import { fetchChartData } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ticker = req.nextUrl.searchParams.get("ticker")?.trim();
    const range = req.nextUrl.searchParams.get("range") || "1mo";
    if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

    const data = await fetchChartData(ticker, range);
    if (!data) {
      return NextResponse.json({ error: "차트 데이터를 불러올 수 없습니다." }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

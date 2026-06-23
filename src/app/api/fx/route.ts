import { NextResponse } from "next/server";
import { fetchCurrentPrice } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const dynamic = "force-dynamic";

// USD→KRW 환율 (Yahoo "KRW=X" = 1달러당 원). 표시통화 변환에 사용.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ usdkrw: null }, { status: 401 });

  let usdkrw: number | null = null;
  try { usdkrw = await fetchCurrentPrice("KRW=X"); } catch {}
  return NextResponse.json({ usdkrw });
}

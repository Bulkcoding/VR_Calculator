import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockApi";
import { getUserId } from "@/lib/getUserId";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  const results = await searchStocks(q);
  return NextResponse.json(results);
}

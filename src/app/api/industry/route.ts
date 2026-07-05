import { NextResponse } from "next/server";
import { fetchIndustryRankings } from "@/lib/industryApi";

export async function GET() {
  try {
    const industries = await fetchIndustryRankings();
    return NextResponse.json(
      { industries, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("Failed to fetch industry rankings", error);
    return NextResponse.json({ error: "산업 데이터를 불러오지 못했습니다." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { importBrokerHoldings } from "@/lib/brokerImport";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function POST() {
  const userId = await requireUserId();

  try {
    const result = await importBrokerHoldings(userId, "kis");
    return NextResponse.json({
      ok: true,
      added: result.added,
      updated: result.updated,
      accountSummary: result.accountSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown KIS error";
    const status = message.includes("not found") ? 400 : message.includes("Saved credentials") ? 500 : 502;
    return NextResponse.json({ error: `KIS API error: ${message}` }, { status });
  }
}

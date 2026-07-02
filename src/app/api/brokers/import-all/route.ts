import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { syncAllLinkedBrokerHoldings } from "@/lib/brokerImport";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function POST() {
  const userId = await requireUserId();
  const result = await syncAllLinkedBrokerHoldings(userId);

  if (result.linkedBrokers.length === 0) {
    return NextResponse.json({ error: "No linked brokers found" }, { status: 400 });
  }

  if (result.importedBrokers.length === 0) {
    return NextResponse.json(
      {
        error: "No supported linked brokers found",
        unsupportedBrokers: result.unsupportedBrokers,
        results: result.results,
      },
      { status: 400 }
    );
  }

  const hasFailure = result.failedBrokers.length > 0;

  return NextResponse.json({
    ok: !hasFailure,
    added: result.added,
    updated: result.updated,
    mergedCount: result.mergedHoldings.length,
    importedBrokers: result.importedBrokers,
    unsupportedBrokers: result.unsupportedBrokers,
    results: result.results,
  }, { status: hasFailure ? 207 : 200 });
}

import { decrypt } from "@/lib/crypto";
import { fetchKisHoldings, type KisAccountSummary } from "@/lib/kisApi";
import { prisma } from "@/lib/prisma";
import {
  fetchTossHoldingsViaProxy,
  type TossProxyAccount,
} from "@/lib/tossProxy";

export type SupportedBrokerId = "kis" | "toss";

export interface ImportedHolding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: string;
  market: string | null;
  broker: string;
}

export interface BrokerFetchResult {
  broker: SupportedBrokerId;
  holdings: ImportedHolding[];
  accountSummary?: KisAccountSummary;
  account?: TossProxyAccount;
}

export interface BrokerImportResult extends BrokerFetchResult {
  added: number;
  updated: number;
}

export interface SyncAllBrokerResult {
  ok: boolean;
  broker: string;
  holdingCount: number;
  error?: string;
}

const SUPPORTED_BROKERS: SupportedBrokerId[] = ["kis", "toss"];

function isSupportedBroker(broker: string): broker is SupportedBrokerId {
  return SUPPORTED_BROKERS.includes(broker as SupportedBrokerId);
}

function readCredentialPayload(encryptedKey: string) {
  const parsed = JSON.parse(decrypt(encryptedKey)) as {
    appKey?: string;
    appSecret?: string;
    accNo?: string;
  };

  const appKey = String(parsed.appKey || "").trim();
  const appSecret = String(parsed.appSecret || "").trim();
  const accNo = String(parsed.accNo || "").trim();

  if (!appKey || !appSecret || !accNo) {
    throw new Error("Saved credentials are incomplete");
  }

  return { appKey, appSecret, accNo };
}

function toImportedHolding(input: Omit<ImportedHolding, "currency" | "market"> & Partial<Pick<ImportedHolding, "currency" | "market">>): ImportedHolding {
  return {
    ...input,
    currency: String(input.currency || "KRW").toUpperCase(),
    market: input.market ?? null,
  };
}

export async function fetchBrokerHoldings(userId: string, broker: SupportedBrokerId): Promise<BrokerFetchResult> {
  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker } },
  });

  if (!cred) {
    throw new Error(`${broker.toUpperCase()} credentials not found`);
  }

  const { appKey, appSecret, accNo } = readCredentialPayload(cred.encryptedKey);

  if (broker === "kis") {
    const result = await fetchKisHoldings(appKey, appSecret, accNo);
    return {
      broker,
      holdings: result.holdings.map((holding) =>
        toImportedHolding({
          ...holding,
          currency: "KRW",
          market: null,
          broker,
        })
      ),
      accountSummary: result.accountSummary,
    };
  }

  const result = await fetchTossHoldingsViaProxy(appKey, appSecret, accNo);
  return {
    broker,
    holdings: result.holdings.map((holding) =>
      toImportedHolding({
        ...holding,
        broker,
      })
    ),
    account: result.account,
  };
}

export async function upsertImportedHoldings(userId: string, holdings: ImportedHolding[]) {
  let added = 0;
  let updated = 0;

  for (const holding of holdings) {
    const existing = await prisma.holding.findUnique({
      where: { userId_ticker: { userId, ticker: holding.ticker } },
    });

    if (existing) {
      await prisma.holding.update({
        where: { id: existing.id },
        data: {
          quantity: holding.quantity,
          avgPrice: holding.avgPrice,
          currentPrice: holding.currentPrice,
          name: holding.name,
          currency: holding.currency,
          market: holding.market,
          broker: holding.broker,
        },
      });
      updated++;
      continue;
    }

    await prisma.holding.create({
      data: {
        userId,
        ticker: holding.ticker,
        name: holding.name,
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        currentPrice: holding.currentPrice,
        currency: holding.currency,
        market: holding.market,
        broker: holding.broker,
      },
    });
    added++;
  }

  return { added, updated };
}

export function mergeImportedHoldingsByTicker(holdings: ImportedHolding[]): ImportedHolding[] {
  const merged = new Map<string, ImportedHolding>();

  for (const holding of holdings) {
    const existing = merged.get(holding.ticker);
    if (!existing) {
      merged.set(holding.ticker, { ...holding });
      continue;
    }

    const totalQuantity = existing.quantity + holding.quantity;
    const totalCost = existing.avgPrice * existing.quantity + holding.avgPrice * holding.quantity;
    const broker = existing.broker === holding.broker ? existing.broker : "multi";

    merged.set(holding.ticker, {
      ticker: holding.ticker,
      name: existing.name || holding.name,
      quantity: totalQuantity,
      avgPrice: totalQuantity > 0 ? totalCost / totalQuantity : 0,
      currentPrice: holding.currentPrice || existing.currentPrice,
      currency: existing.currency || holding.currency,
      market: existing.market || holding.market,
      broker,
    });
  }

  return [...merged.values()];
}

export async function importBrokerHoldings(userId: string, broker: SupportedBrokerId): Promise<BrokerImportResult> {
  const fetched = await fetchBrokerHoldings(userId, broker);
  const counts = await upsertImportedHoldings(userId, fetched.holdings);
  return {
    ...fetched,
    ...counts,
  };
}

export async function syncAllLinkedBrokerHoldings(userId: string) {
  const creds = await prisma.brokerCredential.findMany({
    where: { userId },
    select: { broker: true },
  });

  const linkedBrokers = creds.map((cred) => cred.broker);
  const importableBrokers = linkedBrokers.filter(isSupportedBroker);
  const unsupportedBrokers = linkedBrokers.filter((broker) => !isSupportedBroker(broker));

  const results: SyncAllBrokerResult[] = [];
  const fetchedHoldings: ImportedHolding[] = [];

  for (const broker of SUPPORTED_BROKERS) {
    if (!importableBrokers.includes(broker)) continue;

    try {
      const fetched = await fetchBrokerHoldings(userId, broker);
      fetchedHoldings.push(...fetched.holdings);
      results.push({ ok: true, broker, holdingCount: fetched.holdings.length });
    } catch (error) {
      results.push({
        ok: false,
        broker,
        holdingCount: 0,
        error: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  const mergedHoldings = mergeImportedHoldingsByTicker(fetchedHoldings);
  const counts = mergedHoldings.length > 0
    ? await upsertImportedHoldings(userId, mergedHoldings)
    : { added: 0, updated: 0 };

  return {
    results,
    mergedHoldings,
    added: counts.added,
    updated: counts.updated,
    linkedBrokers,
    importedBrokers: results.filter((result) => result.ok).map((result) => result.broker),
    failedBrokers: results.filter((result) => !result.ok),
    unsupportedBrokers,
  };
}

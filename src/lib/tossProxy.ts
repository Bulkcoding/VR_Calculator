/**
 * Fly.io IP configuration (2026-06-30)
 * ─────────────────────────────────────
 * Inbound  (앱 접속용)      : 168.220.95.254  (fly ips allocate-v4)
 * Outbound (→토스증권 API)  : 216.246.19.69   (shared NAT, fly ssh console -C "wget -qO- https://api.ipify.org")
 *
 * 토스증권 Open API 화이트리스트에는 Outbound IP를 등록해야 함.
 * Inbound IP는 앱 도메인(vr-calculator.fly.dev)에 연결된 공인 IP로, 토스와 무관.
 *
 * 변경 시: flyctl ips list --app vr-calculator  (인바운드)
 *         flyctl ssh console -C "curl -s https://api.ipify.org"  (아웃바운드)
 */

export interface TossProxyHolding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: string;
  market: string | null;
}

export interface TossProxyAccount {
  accountNo: string;
  accountSeq: number;
}

interface TossProxyResponse {
  holdings: TossProxyHolding[];
  account: TossProxyAccount;
}

function normalizeAccountNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

async function tossFetch(path: string, init: RequestInit = {}) {
  const TOSS_BASE_URL = "https://openapi.tossinvest.com";
  const res = await fetch(`${TOSS_BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errorMessage = data?.error?.message || data?.message || text || `Toss HTTP ${res.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

async function issueToken(appKey: string, appSecret: string) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: appKey,
    client_secret: appSecret,
  });

  const data = await tossFetch("/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!data?.access_token) {
    throw new Error("Toss access token missing");
  }

  return data.access_token as string;
}

async function getAccounts(accessToken: string) {
  const data = await tossFetch("/api/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!Array.isArray(data?.result)) {
    throw new Error("Toss accounts response is invalid");
  }

  return data.result as any[];
}

function resolveAccount(accounts: any[], accNo: string) {
  const target = normalizeAccountNo(accNo);
  return accounts.find((account) => normalizeAccountNo(account.accountNo) === target) || null;
}

async function getHoldings(accessToken: string, accountSeq: number) {
  const data = await tossFetch("/api/v1/holdings", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Tossinvest-Account": String(accountSeq),
    },
  });

  const items = data?.result?.items;
  if (!Array.isArray(items)) {
    throw new Error("Toss holdings response is invalid");
  }

  return items as any[];
}

function normalizeHolding(item: any): TossProxyHolding {
  const marketCountry = String(item.marketCountry || "");
  return {
    ticker: String(item.symbol || ""),
    name: String(item.name || ""),
    quantity: Number(item.quantity) || 0,
    avgPrice: Number(item.averagePurchasePrice) || 0,
    currentPrice: Number(item.lastPrice) || 0,
    currency: String(item.currency || "KRW"),
    market: marketCountry === "KR" ? "KRX" : marketCountry === "US" ? "US" : marketCountry || null,
  };
}

export async function fetchTossHoldingsViaProxy(
  appKey: string,
  appSecret: string,
  accNo: string,
): Promise<TossProxyResponse> {
  const accessToken = await issueToken(appKey, appSecret);
  const accounts = await getAccounts(accessToken);
  const account = resolveAccount(accounts, accNo);

  if (!account?.accountSeq) {
    throw new Error("Matching Toss account not found");
  }

  const holdings = await getHoldings(accessToken, account.accountSeq);
  return {
    holdings: holdings.map(normalizeHolding),
    account: {
      accountNo: account.accountNo,
      accountSeq: Number(account.accountSeq),
    },
  };
}

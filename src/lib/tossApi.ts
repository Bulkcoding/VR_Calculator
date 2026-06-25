const TOSS_BASE_URL = "https://openapi.tossinvest.com";

// 토스는 등록된 IP에서만 호출을 허용한다. Vercel은 출구 IP가 고정이 아니므로,
// TOSS_PROXY_URL(고정 IP 프록시)이 설정되면 그 프록시를 경유한다. 없으면 직접 호출(로컬).
let dispatcherPromise: Promise<unknown> | null | undefined;
async function getDispatcher(): Promise<unknown> {
  if (dispatcherPromise !== undefined) return dispatcherPromise;
  const proxy = process.env.TOSS_PROXY_URL;
  if (!proxy) {
    dispatcherPromise = null;
    return null;
  }
  dispatcherPromise = import("undici").then((u) => new u.ProxyAgent(proxy));
  return dispatcherPromise;
}

async function tossFetch(url: string, init?: RequestInit): Promise<Response> {
  const dispatcher = await getDispatcher();
  return fetch(url, dispatcher ? ({ ...init, dispatcher } as RequestInit) : init);
}

interface TossToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TossHolding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: "KRW" | "USD";
}

// 토스는 "client당 유효 토큰 1개" 정책이라 매 호출 재발급 시 직전 토큰이 무효화될 수 있다.
// 만료 60초 전까지 client별로 토큰을 재사용한다. (서버 인스턴스 메모리 캐시)
const tokenCache = new Map<string, { token: TossToken; expiresAt: number }>();

async function getToken(clientId: string, clientSecret: string): Promise<TossToken> {
  const cached = tokenCache.get(clientId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await tossFetch(`${TOSS_BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Toss token error: ${await res.text()}`);
  }
  const token: TossToken = await res.json();
  tokenCache.set(clientId, { token, expiresAt: Date.now() + token.expires_in * 1000 });
  return token;
}

interface TossAccount {
  accountNo: string;
  accountSeq: number;
  accountType: string;
}

async function fetchAccounts(token: TossToken): Promise<TossAccount[]> {
  const res = await tossFetch(`${TOSS_BASE_URL}/api/v1/accounts`, {
    headers: { authorization: `${token.token_type} ${token.access_token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Toss accounts error: ${JSON.stringify(data)}`);
  return data?.result || [];
}

async function fetchHoldingsForAccount(token: TossToken, accountSeq: number): Promise<TossHolding[]> {
  const res = await tossFetch(`${TOSS_BASE_URL}/api/v1/holdings`, {
    headers: {
      authorization: `${token.token_type} ${token.access_token}`,
      "X-Tossinvest-Account": String(accountSeq),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Toss holdings error: ${JSON.stringify(data)}`);

  const items: any[] = data?.result?.items || [];
  return items.map((item: any) => ({
    ticker: item.symbol || "",
    name: item.name || "",
    quantity: parseFloat(item.quantity) || 0,
    avgPrice: parseFloat(item.averagePurchasePrice) || 0,
    currentPrice: parseFloat(item.lastPrice) || 0,
    currency: item.currency === "USD" ? "USD" : "KRW",
  }));
}

export async function fetchTossHoldings(
  clientId: string,
  clientSecret: string
): Promise<{ holdings: TossHolding[] }> {
  const token = await getToken(clientId, clientSecret);
  const accounts = await fetchAccounts(token);
  if (accounts.length === 0) {
    return { holdings: [] };
  }

  // 종합매매 계좌가 여러 개일 수 있어 전부 조회 후 합친다.
  const all = await Promise.all(accounts.map((a) => fetchHoldingsForAccount(token, a.accountSeq)));
  const holdings = all.flat().filter((h) => h.ticker && h.quantity > 0);
  return { holdings };
}

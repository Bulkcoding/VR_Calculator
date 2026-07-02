import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.TOSS_PROXY_PORT || process.env.PORT || 8787);
const SHARED_SECRET = process.env.TOSS_PROXY_SHARED_SECRET || "";
const TOSS_BASE_URL = "https://openapi.tossinvest.com";

if (!SHARED_SECRET) {
  console.error("Missing TOSS_PROXY_SHARED_SECRET");
  process.exit(1);
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function isAuthorized(req) {
  const provided = req.headers["x-proxy-secret"];
  if (typeof provided !== "string") return false;

  const left = Buffer.from(provided);
  const right = Buffer.from(SHARED_SECRET);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function normalizeAccountNo(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

async function tossFetch(path, init = {}) {
  const res = await fetch(`${TOSS_BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  let data = null;
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

async function issueToken(appKey, appSecret) {
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

  return data.access_token;
}

async function getAccounts(accessToken) {
  const data = await tossFetch("/api/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!Array.isArray(data?.result)) {
    throw new Error("Toss accounts response is invalid");
  }

  return data.result;
}

function resolveAccount(accounts, accNo) {
  const target = normalizeAccountNo(accNo);
  return accounts.find((account) => normalizeAccountNo(account.accountNo) === target) || null;
}

async function getHoldings(accessToken, accountSeq) {
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

  return items;
}

function normalizeHolding(item) {
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

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/toss/holdings") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const appKey = String(body.appKey || "").trim();
    const appSecret = String(body.appSecret || "").trim();
    const accNo = String(body.accNo || "").trim();

    if (!appKey || !appSecret || !accNo) {
      sendJson(res, 400, { error: "appKey, appSecret, accNo are required" });
      return;
    }

    const accessToken = await issueToken(appKey, appSecret);
    const accounts = await getAccounts(accessToken);
    const account = resolveAccount(accounts, accNo);

    if (!account?.accountSeq) {
      sendJson(res, 404, { error: "Matching Toss account not found" });
      return;
    }

    const holdings = await getHoldings(accessToken, account.accountSeq);
    sendJson(res, 200, {
      holdings: holdings.map(normalizeHolding),
      account: {
        accountNo: account.accountNo,
        accountSeq: Number(account.accountSeq),
      },
    });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Toss proxy listening on http://0.0.0.0:${PORT}`);
});

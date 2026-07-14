async function getTossHoldings(credential, onProgress) {
  const appKey = String(credential?.appKey || '').trim();
  const appSecret = String(credential?.appSecret || '').trim();
  const accountNo = normalizeAccountNo(credential?.accountNo || '');

  if (!appKey || !appSecret || !accountNo) {
    throw new Error('토스증권 연동에는 App Key, Secret Key, 계좌번호가 모두 필요합니다.');
  }

  onProgress('토스 액세스 토큰을 발급합니다.');
  const token = await issueToken(appKey, appSecret);

  onProgress('토스 계좌 목록을 조회합니다.');
  const accounts = await getAccounts(token);
  const account = accounts.find((item) => normalizeAccountNo(item.accountNo) === accountNo);
  if (!account) {
    throw new Error('입력한 계좌번호와 일치하는 토스 계좌를 찾지 못했습니다.');
  }

  onProgress(`토스 계좌 **${account.accountNo.slice(-4)} 의 보유주식을 조회합니다.`);
  const holdings = await fetchHoldings(token, account.accountSeq);

  onProgress('보유주식 응답을 ReValue 형식으로 변환합니다.');
  const converted = holdings
    .map(toHoldingPayload)
    .filter((item) => item.ticker && item.quantity > 0);

  for (const holding of converted) {
    if (holding.avgPrice <= 0 || !holding.currentPrice || holding.currentPrice <= 0) {
      onProgress(`값 확인 필요: ${holding.name} (${holding.ticker}) qty=${holding.quantity}, avg=${holding.avgPrice}, current=${holding.currentPrice ?? 'null'}`);
    }
  }

  onProgress(`보유주식 ${converted.length}건 변환 완료`);
  return converted;
}

async function issueToken(appKey, appSecret) {
  const response = await fetch('https://openapi.tossinvest.com/oauth2/token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: appKey,
      client_secret: appSecret,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(buildErrorMessage('토스 토큰 발급 실패', response, payload));
  }

  const data = JSON.parse(payload);
  if (!data?.access_token) {
    throw new Error('토스 액세스 토큰 응답이 비어 있습니다.');
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'Bearer',
  };
}

async function getAccounts(token) {
  const response = await fetch('https://openapi.tossinvest.com/api/v1/accounts', {
    headers: {
      Accept: 'application/json',
      Authorization: `${token.tokenType} ${token.accessToken}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(buildErrorMessage('토스 계좌 조회 실패', response, payload));
  }

  const data = JSON.parse(payload);
  if (!Array.isArray(data?.result)) {
    throw new Error('토스 계좌 응답 형식이 올바르지 않습니다.');
  }

  return data.result;
}

async function fetchHoldings(token, accountSeq) {
  const response = await fetch('https://openapi.tossinvest.com/api/v1/holdings', {
    headers: {
      Accept: 'application/json',
      Authorization: `${token.tokenType} ${token.accessToken}`,
      'X-Tossinvest-Account': String(accountSeq),
    },
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(buildErrorMessage('토스 보유주식 조회 실패', response, payload));
  }

  const data = JSON.parse(payload);
  if (!Array.isArray(data?.result?.items)) {
    throw new Error('토스 보유주식 응답 형식이 올바르지 않습니다.');
  }

  return data.result.items;
}

function toHoldingPayload(item) {
  const quantity = toNumber(item.quantity) || 0;
  const avgPrice = resolveAveragePrice(item, quantity);
  const currentPrice = resolveCurrentPrice(item, quantity);

  return {
    ticker: String(item.symbol || '').trim(),
    name: String(item.name || item.symbol || '').trim(),
    quantity,
    avgPrice,
    currentPrice,
    currency: item.currency === 'USD' ? 'USD' : 'KRW',
    market: normalizeMarket(item.marketCountry),
  };
}

function resolveAveragePrice(item, quantity) {
  const averagePurchasePrice = toNumber(item.averagePurchasePrice);
  if (averagePurchasePrice && averagePurchasePrice > 0) return averagePurchasePrice;

  const purchaseAmount = toNumber(item?.marketValue?.purchaseAmount);
  if (purchaseAmount && quantity > 0) return purchaseAmount / quantity;
  return 0;
}

function resolveCurrentPrice(item, quantity) {
  const lastPrice = toNumber(item.lastPrice);
  if (lastPrice && lastPrice > 0) return lastPrice;

  const amount = toNumber(item?.marketValue?.amount);
  if (amount && quantity > 0) return amount / quantity;
  return lastPrice;
}

function normalizeMarket(marketCountry) {
  if (marketCountry === 'KR') return 'KRX';
  if (marketCountry === 'US') return 'US';
  return marketCountry || null;
}

function normalizeAccountNo(value) {
  return String(value || '').replace(/[^0-9A-Za-z]/g, '');
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildErrorMessage(prefix, response, payload) {
  const detail = tryExtractErrorDetail(payload);
  const requestId = response.headers.get('x-request-id') || response.headers.get('x-amz-cf-id');
  const requestIdSuffix = requestId ? ` (requestId: ${requestId})` : '';
  return detail
    ? `${prefix}: ${response.status} ${detail}${requestIdSuffix}`
    : `${prefix}: ${response.status}${requestIdSuffix}`;
}

function tryExtractErrorDetail(payload) {
  if (!payload) return null;

  try {
    const root = JSON.parse(payload);
    if (typeof root?.error === 'string') {
      return root.error_description ? `${root.error} - ${root.error_description}` : root.error;
    }

    if (root?.error && typeof root.error === 'object') {
      const code = root.error.code;
      const message = root.error.message;
      if (code && message) return `${code} - ${message}`;
      if (message) return message;
    }
  } catch {
  }

  return String(payload).trim() || null;
}

module.exports = {
  getTossHoldings,
};

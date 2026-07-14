const KIS_REAL_URL = 'https://openapi.koreainvestment.com:9443';
const tokenCache = new Map();

async function getKisHoldings(credential, onProgress) {
  const appKey = String(credential?.appKey || '').trim();
  const appSecret = String(credential?.appSecret || '').trim();
  const accountNo = String(credential?.accountNo || '').trim();

  if (!appKey || !appSecret || !accountNo) {
    throw new Error('한국투자증권 연동에는 App Key, Secret Key, 계좌번호가 모두 필요합니다.');
  }

  const token = await getToken(appKey, appSecret, onProgress);
  const cleanAcc = accountNo.replace(/[^0-9]/g, '');
  if (cleanAcc.length < 10) {
    throw new Error('한국투자증권 계좌번호 형식이 올바르지 않습니다.');
  }

  onProgress('한국투자증권 보유주식을 조회합니다.');
  const response = await fetch(
    `${KIS_REAL_URL}/uapi/domestic-stock/v1/trading/inquire-balance` +
      `?CANO=${cleanAcc.slice(0, 8)}` +
      `&ACNT_PRDT_CD=${cleanAcc.slice(8, 10)}` +
      `&AFHR_FLPR_YN=N` +
      `&OFL_YN=` +
      `&INQR_DVSN=01` +
      `&UNPR_DVSN=01` +
      `&FUND_STTL_ICLD_YN=N` +
      `&FNCG_AMT_AUTO_RQST_YN=N` +
      `&PRCS_DVSN=01` +
      `&CTX_AREA_FK100=` +
      `&CTX_AREA_NK100=`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `${token.tokenType} ${token.accessToken}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: 'TTTC8434R',
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const data = await response.json();
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(`KIS error: ${data.msg1 || JSON.stringify(data)}`);
  }

  if (!response.ok) {
    throw new Error(`KIS HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  const output1 = Array.isArray(data?.output1) ? data.output1 : [];
  const holdings = output1
    .map((item) => ({
      ticker: String(item?.pdno || '').trim(),
      name: String(item?.prdt_name || item?.pdno || '').trim(),
      quantity: Number(item?.hldg_qty) || 0,
      avgPrice: Number(item?.pchs_avg_pric) || 0,
      currentPrice: Number(item?.prpr) || 0,
      currency: 'KRW',
      market: 'KRX',
    }))
    .filter((item) => item.ticker && item.quantity > 0);

  onProgress(`한국투자증권 ${holdings.length}건 변환 완료`);
  return holdings;
}

async function getToken(appKey, appSecret, onProgress) {
  const cacheKey = `${appKey}:real`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    onProgress('한국투자증권 액세스 토큰을 재사용합니다.');
    return cached;
  }

  onProgress('한국투자증권 액세스 토큰을 발급합니다.');
  const response = await fetch(`${KIS_REAL_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`KIS token error: ${JSON.stringify(data)}`);
  }

  if (!data?.access_token) {
    throw new Error('KIS 액세스 토큰 응답이 비어 있습니다.');
  }

  const token = {
    accessToken: data.access_token,
    tokenType: data.token_type || 'Bearer',
    expiresAt: Date.now() + (Number(data.expires_in) || 0) * 1000,
  };
  tokenCache.set(cacheKey, token);
  return token;
}

module.exports = {
  getKisHoldings,
};

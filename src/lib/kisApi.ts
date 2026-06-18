const KIS_REAL_URL = "https://openapi.koreainvestment.com:9443";
const KIS_DEMO_URL = "https://openapivts.koreainvestment.com:29443";

interface KisToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface KisHolding {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

async function getToken(appKey: string, appSecret: string, isDemo = false): Promise<KisToken> {
  const base = isDemo ? KIS_DEMO_URL : KIS_REAL_URL;
  const res = await fetch(`${base}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KIS token error: ${err}`);
  }
  return res.json();
}

export interface KisAccountSummary {
  totalEvlu: number;
  totalPurchase: number;
  profitLoss: number;
  profitLossRate: number;
  cashBalance: number;
}

export async function fetchKisHoldings(
  appKey: string,
  appSecret: string,
  accNo: string,
  isDemo = false
): Promise<{ holdings: KisHolding[]; accountSummary: KisAccountSummary }> {
  const base = isDemo ? KIS_DEMO_URL : KIS_REAL_URL;
  const token = await getToken(appKey, appSecret, isDemo);

  const cleanAcc = accNo.replace(/[^0-9]/g, "");
  const trId = "TTTC8434R"; // 잔고조회 (국내주식)
  const res = await fetch(
    `${base}/uapi/domestic-stock/v1/trading/inquire-balance` +
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
        "Content-Type": "application/json",
        authorization: `${token.token_type} ${token.access_token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: trId,
      },
    }
  );

  const data = await res.json();

  if (data?.rt_cd && data.rt_cd !== "0") {
    throw new Error(`KIS error: ${data.msg1 || JSON.stringify(data)}`);
  }

  if (!res.ok) {
    throw new Error(`KIS HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  const output1: any[] = data?.output1 || [];
  const output2 = data?.output2?.[0] || {};

  const holdings: KisHolding[] = output1.map((item: any) => {
    const name = item.prdt_name || "";
    const ticker = item.pdno || "";
    const quantity = parseFloat(item.hldg_qty) || 0;
    const avgPrice = parseFloat(item.pchs_avg_pric) || 0;
    const currentPrice = parseFloat(item.prpr) || 0;
    return { ticker, name, quantity, avgPrice, currentPrice };
  });

  return {
    holdings,
    accountSummary: {
      totalEvlu: parseFloat(output2.evlu_amt) || 0,
      totalPurchase: parseFloat(output2.pchs_amt) || 0,
      profitLoss: parseFloat(output2.evlu_pfls_amt) || 0,
      profitLossRate: parseFloat(output2.evlu_pfls_rt) || 0,
      cashBalance: parseFloat(output2.dnca_tot_amt) || 0,
    },
  };
}

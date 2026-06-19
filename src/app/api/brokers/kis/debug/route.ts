import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchKisHoldings } from "@/lib/kisApi";
import { getUserId } from "@/lib/getUserId";

async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Unauthorized");
  return id;
}

const KIS_REAL_URL = "https://openapi.koreainvestment.com:9443";

export async function GET() {
  const userId = await requireUserId();

  const cred = await prisma.brokerCredential.findUnique({
    where: { userId_broker: { userId, broker: "kis" } },
  });
  if (!cred) return NextResponse.json({ error: "No KIS credentials" });

  let parsed: { appKey: string; appSecret: string; accNo: string };
  try {
    parsed = JSON.parse(decrypt(cred.encryptedKey));
  } catch {
    return NextResponse.json({ error: "Decrypt failed" });
  }

  const { appKey, appSecret, accNo } = parsed;
  const cleanAcc = accNo.replace(/[^0-9]/g, "");

  try {
    const tokenRes = await fetch(`${KIS_REAL_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", appkey: appKey, appsecret: appSecret }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return NextResponse.json({ step: "token", error: tokenData });
    }

    const accessToken = tokenData.access_token;
    const tokenType = tokenData.token_type || "Bearer";

    const balanceRes = await fetch(
      `${KIS_REAL_URL}/uapi/domestic-stock/v1/trading/inquire-balance` +
        `?CANO=${cleanAcc.slice(0, 8)}&ACNT_PRDT_CD=${cleanAcc.slice(8, 10)}` +
        `&AFHR_FLPR_YN=N&OFL_YN=&INQR_DVSN=01&UNPR_DVSN=01` +
        `&FUND_STTL_ICLD_YN=N&FNCG_AMT_AUTO_RQST_YN=N&PRCS_DVSN=01&CTX_AREA_FK100=&CTX_AREA_NK100=`,
      {
        headers: {
          "Content-Type": "application/json",
          authorization: `${tokenType} ${accessToken}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: "TTTC8434R",
        },
      }
    );

    const balanceData = await balanceRes.json();

    return NextResponse.json({
      accNo_clean: cleanAcc,
      cano: cleanAcc.slice(0, 8),
      acnt_prdt_cd: cleanAcc.slice(8, 10),
      balance_response: balanceData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}

import Link from "next/link";
import Image from "next/image";
import { getBrokerLogoPath } from "@/lib/brokerLogos";

interface HoldingCardProps {
  id: string;
  name: string;
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  currency: string;
  broker: string;
}

const currencySymbol = (c: string) => (c === "USD" ? "$" : "원");

const brokerLabel: Record<string, string> = {
  kis: "한국투자증권",
  kiwoom: "키움증권",
  toss: "토스증권",
  "toss-screenshot": "토스 캡처",
  multi: "통합",
  other: "기타",
  kakao: "카카오증권",
  samsung: "삼성증권",
  mirae: "미래에셋증권",
  daishin: "대신증권",
  nh: "NH투자증권",
  shinhan: "신한투자증권",
  hana: "하나증권",
  kb: "KB증권",
  yuanta: "유안타증권",
  eugene: "유진투자증권",
  ls: "LS증권",
  csv: "CSV",
  manual: "",
};


const brokerColors: Record<string, string> = {
  kis: "bg-blue-100 text-blue-700",
  kiwoom: "bg-red-100 text-red-700",
  toss: "bg-yellow-100 text-yellow-800",
  "toss-screenshot": "bg-yellow-50 text-yellow-700",
  multi: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700",
  kakao: "bg-yellow-100 text-yellow-800",
  samsung: "bg-blue-100 text-blue-700",
  mirae: "bg-purple-100 text-purple-700",
  daishin: "bg-green-100 text-green-700",
  nh: "bg-indigo-100 text-indigo-700",
  shinhan: "bg-cyan-100 text-cyan-700",
  hana: "bg-emerald-100 text-emerald-700",
  kb: "bg-orange-100 text-orange-700",
  yuanta: "bg-red-100 text-red-700",
  eugene: "bg-violet-100 text-violet-700",
  ls: "bg-pink-100 text-pink-700",
  csv: "bg-gray-100 text-gray-600",
  manual: "",
};

export default function HoldingCard({ id, name, ticker, quantity, avgPrice, currentPrice, currency, broker }: HoldingCardProps) {
  const unit = currencySymbol(currency);
  const hasPrice = currentPrice !== null;
  const gainPct = hasPrice ? ((currentPrice! - avgPrice) / avgPrice) * 100 : null;
  const gainAmount = hasPrice ? (currentPrice! - avgPrice) * quantity : null;
  const badge = brokerLabel[broker];
  const badgeColor = brokerColors[broker];
  const logoPath = getBrokerLogoPath(broker);

  return (
    <Link
      href={`/holdings/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {logoPath && (
            <Image src={logoPath} alt={badge || ""} width={24} height={24} className="w-6 h-6 rounded-full object-contain" unoptimized />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{ticker}</p>
          </div>
        </div>
        {gainPct !== null && (
          <div className="text-right shrink-0">
            <span
              className={`text-sm font-medium ${gainPct >= 0 ? "text-red-500" : "text-blue-500"}`}
            >
              {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%
            </span>
            <div
              className={`text-xs ${gainPct >= 0 ? "text-red-400" : "text-blue-400"}`}
            >
              {gainPct >= 0 ? "+" : ""}{unit}{Math.abs(gainAmount!).toLocaleString()}
            </div>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>보유?�량</span>
          <span className="font-medium">{quantity.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>?�균?��?</span>
          <span className="font-medium">{unit}{avgPrice.toLocaleString()}</span>
        </div>
        {hasPrice && (
          <div className="flex justify-between">
            <span>?�재가</span>
            <span className="font-medium">{unit}{currentPrice!.toLocaleString()}</span>
          </div>
        )}
      </div>
    </Link>
  );
}




import Link from "next/link";

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

const currencySymbol = (c: string) => (c === "USD" ? "$" : "₩");

const brokerLabel: Record<string, string> = {
  kis: "한투",
  kiwoom: "키움",
  toss: "토스",
  kakao: "카카오",
  samsung: "삼성",
  mirae: "미래에셋",
  daishin: "대신",
  nh: "NH투자",
  shinhan: "신한",
  kb: "KB증권",
  ls: "LS증권",
  csv: "CSV",
  manual: "",
};

const brokerColors: Record<string, string> = {
  kis: "bg-blue-100 text-blue-700",
  kiwoom: "bg-red-100 text-red-700",
  toss: "bg-yellow-100 text-yellow-800",
  kakao: "bg-yellow-100 text-yellow-800",
  samsung: "bg-blue-100 text-blue-700",
  mirae: "bg-purple-100 text-purple-700",
  daishin: "bg-green-100 text-green-700",
  nh: "bg-indigo-100 text-indigo-700",
  shinhan: "bg-cyan-100 text-cyan-700",
  kb: "bg-orange-100 text-orange-700",
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

  return (
    <Link
      href={`/holdings/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeColor}`}>
              {badge}
            </span>
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
          <span>보유수량</span>
          <span className="font-medium">{quantity.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>평균단가</span>
          <span className="font-medium">{unit}{avgPrice.toLocaleString()}</span>
        </div>
        {hasPrice && (
          <div className="flex justify-between">
            <span>현재가</span>
            <span className="font-medium">{unit}{currentPrice!.toLocaleString()}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

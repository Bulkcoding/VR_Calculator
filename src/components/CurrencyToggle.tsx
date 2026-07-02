"use client";

export type DisplayCurrency = "USD" | "KRW";

export function CurrencyToggle({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (v: DisplayCurrency) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("USD")}
        className={`px-2.5 py-1 rounded-md transition ${value === "USD" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
      >
        $
      </button>
      <button
        type="button"
        onClick={() => onChange("KRW")}
        className={`px-2.5 py-1 rounded-md transition ${value === "KRW" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
      >
        원
      </button>
    </div>
  );
}

// 네이티브 통화 금액을 표시 통화로 변환 (환율 없으면 교차통화는 null)
export function convertAmount(
  value: number,
  from: string,
  to: DisplayCurrency,
  usdkrw: number | null
): number | null {
  if (from === to) return value;
  if (usdkrw == null || usdkrw <= 0) return null;
  if (from === "USD" && to === "KRW") return value * usdkrw;
  if (from === "KRW" && to === "USD") return value / usdkrw;
  return value;
}

export function formatMoney(value: number | null, currency: DisplayCurrency): string {
  if (value == null) return "—";
  const digits = currency === "USD" ? 2 : 0;
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (currency === "USD") return `$${formatted}`;
  return `${formatted}원`;
}

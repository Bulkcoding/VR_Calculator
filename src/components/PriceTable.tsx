import { VrResult } from "@/lib/vr";

interface PriceTableProps {
  result: VrResult;
  currency?: string;
}

const sym = (c?: string) => (c === "USD" ? "$" : "₩");

export default function PriceTable({ result, currency }: PriceTableProps) {
  const unit = sym(currency);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-green-700 mb-2">
          📉 매수표 (분할 매수)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-600">#</th>
                <th className="px-3 py-2 font-medium text-gray-600">보유수량</th>
                <th className="px-3 py-2 font-medium text-gray-600">매수가</th>
                <th className="px-3 py-2 font-medium text-gray-600">Pool</th>
              </tr>
            </thead>
            <tbody>
              {result.buyTable.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-green-50/50">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.qty}</td>
                  <td className="px-3 py-2 text-green-600 font-medium">
                    {unit}{row.price.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{unit}{row.pool.toLocaleString()}</td>
                </tr>
              ))}
              {result.buyTable.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                    Pool 부족
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-red-700 mb-2">
          📈 매도표 (분할 매도)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-600">#</th>
                <th className="px-3 py-2 font-medium text-gray-600">보유수량</th>
                <th className="px-3 py-2 font-medium text-gray-600">매도가</th>
                <th className="px-3 py-2 font-medium text-gray-600">Pool</th>
              </tr>
            </thead>
            <tbody>
              {result.sellTable.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-red-50/50">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.qty}</td>
                  <td className="px-3 py-2 text-red-600 font-medium">
                    {unit}{row.price.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{unit}{row.pool.toLocaleString()}</td>
                </tr>
              ))}
              {result.sellTable.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                    매도 가능 수량 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

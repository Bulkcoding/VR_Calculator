interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  unit?: string;
  subtext?: string;
  accent?: "blue" | "green" | "red" | "purple" | "neutral";
}

const accentMap = {
  blue: "border-blue-200 bg-blue-50/30",
  green: "border-green-200 bg-green-50/30",
  red: "border-red-200 bg-red-50/30",
  purple: "border-purple-200 bg-purple-50/30",
  neutral: "border-gray-200",
};

export default function StatCard({ label, value, change, changePositive, unit, subtext, accent = "neutral" }: StatCardProps) {
  return (
    <div className={`rounded-xl border ${accentMap[accent]} bg-white p-4 transition hover:shadow-sm`}>
      <div className="text-xs text-gray-500 mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
        <span className="text-lg font-bold text-gray-900">{value}</span>
      </div>
      {(change || subtext) && (
        <div className="mt-1.5 flex items-center gap-2">
          {change && (
            <span className={`text-xs font-semibold ${changePositive ? "text-green-600" : "text-red-500"}`}>
              {changePositive ? "▲" : "▼"} {change}
            </span>
          )}
          {subtext && <span className="text-[11px] text-gray-400">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  type: "buy" | "sell" | "rebalance" | "alert" | "info";
  message: string;
  time: string;
}

const config = {
  buy: { icon: "arrow-up", color: "bg-green-100 text-green-600" },
  sell: { icon: "arrow-down", color: "bg-red-100 text-red-600" },
  rebalance: { icon: "refresh", color: "bg-blue-100 text-blue-600" },
  alert: { icon: "bell", color: "bg-yellow-100 text-yellow-600" },
  info: { icon: "info", color: "bg-gray-100 text-gray-600" },
};

function MiniIcon({ name, className = "w-3.5 h-3.5" }: { name: string; className?: string }) {
  switch (name) {
    case "arrow-up":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
        </svg>
      );
    case "refresh":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        </svg>
      );
    case "info":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ActivityItem({ type, message, time }: ActivityItemProps) {
  const c = config[type];
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-7 h-7 rounded-full ${c.color} flex items-center justify-center shrink-0`}>
        <MiniIcon name={c.icon} />
      </div>
      <div className="flex-1 text-sm text-gray-700 truncate">{message}</div>
      <div className="text-xs text-gray-400 shrink-0">{time}</div>
    </div>
  );
}

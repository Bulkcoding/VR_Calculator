"use client";

import { useEffect, useState } from "react";

import { getMarketSessions, type MarketSession } from "@/lib/marketHours";

export default function MarketStatusBadge() {
  const [lines, setLines] = useState<MarketSession[]>([]);

  useEffect(() => {
    const tick = () => {
      setLines(getMarketSessions());
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-1.5">
      {lines.map((line) => (
        <div key={line.id} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              line.isOpen ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-700 font-medium">{line.label}</span>
          <span className="text-xs text-gray-400">{line.timeLabel}</span>
        </div>
      ))}
    </div>
  );
}
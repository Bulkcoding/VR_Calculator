"use client";

import { useState, useEffect } from "react";
import { getMarketSessions, type MarketSession } from "@/lib/marketHours";

export default function MarketStatusBadge() {
  const [sessions, setSessions] = useState<MarketSession[]>([]);

  useEffect(() => {
    const update = () => setSessions(getMarketSessions());
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {sessions.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              s.isOpen ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-700 font-medium">{s.label}</span>
          <span className="text-xs text-gray-400">{s.timeLabel}</span>
        </div>
      ))}
    </div>
  );
}

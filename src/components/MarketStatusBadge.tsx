"use client";

import { useState, useEffect } from "react";

function isUSDST(now: Date): boolean {
  const y = now.getUTCFullYear();
  const mar8 = new Date(Date.UTC(y, 2, 8));
  const marSun = 8 + ((7 - mar8.getUTCDay()) % 7);
  const nov1 = new Date(Date.UTC(y, 10, 1));
  const novSun = 1 + ((7 - nov1.getUTCDay()) % 7);
  const t = now.getTime();
  return t >= new Date(Date.UTC(y, 2, marSun, 7)).getTime() &&
         t < new Date(Date.UTC(y, 10, novSun, 6)).getTime();
}

function getNowHours(): { h: number; m: number } {
  const kst = new Date(Date.now() + 9 * 3600000);
  return { h: kst.getUTCHours(), m: kst.getUTCMinutes() };
}

function inRange(h: number, m: number, open: number, close: number): boolean {
  const n = h * 60 + m;
  const o = open * 60;
  const c = close * 60;
  return c < o ? n >= o || n < c : n >= o && n < c;
}

interface Line {
  label: string;
  time: string;
  isOpen: boolean;
}

export default function MarketStatusBadge() {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dst = isUSDST(now);
      const { h, m } = getNowHours();

      // 한국 정규장: 09:00 ~ 15:30 KST
      const krOpen = inRange(h, m, 9, 15.5);

      // 해외 데이마켓: 09:00 ~ 17:00 ET
      const etOffset = dst ? 13 : 14; // KST - ET
      const etH = (h - etOffset + 24) % 24;
      const usOpen = inRange(etH, m, 9, 17);

      setLines([
        { label: "국내 정규장", time: "09:00 ~ 15:30", isOpen: krOpen },
        { label: "해외 데이마켓", time: "09:00 ~ 17:00", isOpen: usOpen },
      ]);
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              l.isOpen ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-700 font-medium">{l.label}</span>
          <span className="text-xs text-gray-400">{l.time}</span>
        </div>
      ))}
    </div>
  );
}

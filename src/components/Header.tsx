"use client";

import { useState } from "react";
import Sidebar, { Icon } from "./Sidebar";

interface HeaderProps {
  title: string;
  rightSlot?: React.ReactNode;
}

export default function Header({ title, rightSlot }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 h-full w-64">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <header className="h-16 bg-white border-b border-gray-200 grid grid-cols-3 items-center px-4 sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Icon name="menu" className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 text-center">{title}</h1>

        <div className="flex items-center justify-end gap-2">
          {rightSlot}

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Icon name="bell-filled" className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">알림</div>
                  <div className="max-h-96 overflow-y-auto">
                    {[
                      { type: "buy", msg: "TQQQ 매수 신호 발생", time: "11:30", color: "bg-green-100 text-green-600" },
                      { type: "sell", msg: "SOXL 매도 신호 발생", time: "09:20", color: "bg-red-100 text-red-600" },
                      { type: "rebalance", msg: "리밸런싱 완료", time: "어제 16:10", color: "bg-blue-100 text-blue-600" },
                    ].map((n, i) => (
                      <div key={i} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${n.color.split(" ")[0]}`} />
                          <div className="flex-1 text-sm text-gray-700">{n.msg}</div>
                          <div className="text-xs text-gray-400">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            U
          </div>
        </div>
      </header>
    </>
  );
}

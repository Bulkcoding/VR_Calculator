"use client";

import { useState, useEffect } from "react";
import Sidebar, { Icon } from "./Sidebar";
import BrandWordmark from "./BrandWordmark";

interface HeaderProps {
  title: string;
  subtitle?: string;
  hideBrand?: boolean;
  rightSlot?: React.ReactNode;
}

export default function Header({ title, subtitle, hideBrand, rightSlot }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    if (!notifOpen) return;
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).catch(() => {});
  }, [notifOpen]);

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

      <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-gray-200 bg-white px-4 sm:h-[84px] sm:px-6">
        <div className="z-10 flex min-w-0 items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Icon name="menu" className="w-5 h-5 text-gray-600" />
          </button>
          {!hideBrand && <BrandWordmark className="h-auto w-[150px] sm:w-[210px]" priority />}
        </div>

        {title && (
          <div className="flex-1 min-w-0 px-4 sm:absolute sm:inset-x-0 sm:flex sm:justify-center sm:px-28">
            <h1 className="truncate text-base font-bold text-gray-900 sm:text-lg">{title}</h1>
          </div>
        )}

        <div className="z-10 flex items-center justify-end gap-2">
          {rightSlot}

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Icon name="bell-filled" className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (<span className="absolute top-1.5 right-1.5 min-w-[14px] h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>)}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">알림</div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">알림이 없습니다.</div>
                    ) : (
                      notifications.map(function(n) {
                        var c = n.type === "cycle_start" ? "bg-blue-100" : n.type === "buy_signal" || n.type === "sell_signal" ? "bg-green-100" : n.type === "cycle_end_soon" ? "bg-amber-100" : "bg-gray-100";
                        return (
                          <div key={n.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className={"w-2 h-2 rounded-full " + c} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-900 truncate">{n.title}</div>
                                <div className="text-[11px] text-gray-500 truncate">{n.message}</div>
                              </div>
                              <div className="text-[10px] text-gray-400 shrink-0">{new Date(n.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="theme-gradient-badge w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold">
            U
          </div>
        </div>
      </header>
    </>
  );
}

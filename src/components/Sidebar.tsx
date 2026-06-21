"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "대시보드", icon: "home", disabled: false },
  { href: "/portfolio", label: "포트폴리오", icon: "folder", disabled: true },
  { href: "/rebalancing", label: "리밸런싱", icon: "refresh", disabled: true },
  { href: "/cycles", label: "사이클 기록", icon: "clock", disabled: true },
  { href: "/notifications", label: "알림", icon: "bell", disabled: true },
  { href: "/broker-connections", label: "증권사 연동", icon: "shield", disabled: false },
  { href: "/api-settings", label: "API 연동", icon: "link", disabled: true },
  { href: "/settings", label: "설정", icon: "cog", disabled: true },
];

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const stroke = "currentColor";
  switch (name) {
    case "home":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "folder":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      );
    case "refresh":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "link":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "cog":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "bell-filled":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={stroke} stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
      );
    case "more-horizontal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 pb-2 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
          <Icon name="check" className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-base leading-tight">VR</div>
          <div className="text-[10px] tracking-widest text-gray-400 font-semibold">REBALANCING</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed select-none"
              >
                <Icon name={item.icon} className="w-5 h-5 text-gray-300" />
                {item.label}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon name={item.icon} className={`w-5 h-5 ${active ? "text-blue-600" : "text-gray-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="star" className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Premium</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">고급 기능을 사용해보세요</p>
          <button className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50 transition">
            업그레이드
          </button>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-gray-900">{session?.user?.name || "원석님"}</div>
            <div className="text-[10px] text-gray-400">Premium</div>
          </div>
          <Icon name="arrow-left" className="w-4 h-4 text-gray-300 rotate-180" />
        </button>
      </div>
    </aside>
  );
}

export { Icon };

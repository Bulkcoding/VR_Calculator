"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeQuickSwitch() {
  const { currentTheme, themeId, themes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div className="mb-3 w-72 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Theme</p>
              <p className="text-sm font-semibold text-gray-900">{currentTheme.label}</p>
            </div>
            <Link
              href="/settings"
              className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
          </div>

          <div className="space-y-2">
            {themes.map((theme) => {
              const active = theme.id === themeId;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setTheme(theme.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-blue-200 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-2xl shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{theme.label}</span>
                    <span className="block truncate text-xs text-gray-500">{theme.description}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {active ? "Active" : theme.appearance}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open theme switcher"
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white/95 text-gray-600 shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:text-gray-900"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.5" />
          <path d="M12 19v2.5" />
          <path d="m4.93 4.93 1.77 1.77" />
          <path d="m17.3 17.3 1.77 1.77" />
          <path d="M2.5 12H5" />
          <path d="M19 12h2.5" />
          <path d="m4.93 19.07 1.77-1.77" />
          <path d="m17.3 6.7 1.77-1.77" />
        </svg>
      </button>
    </div>
  );
}

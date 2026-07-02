"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/DashboardShell";
import { useTheme } from "@/components/ThemeProvider";
import type { AppTheme } from "@/lib/themes";

function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: AppTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`rounded-2xl border p-4 text-left transition ${
        isActive
          ? "border-blue-200 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{theme.label}</h2>
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">
              {theme.appearance === "dark" ? "Dark" : "Light"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{theme.description}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isActive ? "사용 중" : "선택 가능"}
        </span>
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${theme.palette.primary}33`,
          background: theme.preview.shell,
        }}
      >
        <div className="flex min-h-44">
          <div
            className="w-28 border-r p-3"
            style={{
              backgroundColor: theme.preview.sidebar,
              borderColor: `${theme.palette.primary}22`,
              color: theme.preview.text,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})` }}
              />
              <div className="space-y-1">
                <div className="h-2.5 w-12 rounded-full bg-white/20" />
                <div className="h-2 w-16 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="space-y-2">
              <div
                className="rounded-xl px-3 py-2"
                style={{
                  backgroundColor: isActive ? `${theme.palette.primary}26` : "rgba(255,255,255,0.05)",
                  boxShadow: isActive ? `inset 0 0 0 1px ${theme.palette.primary}55` : undefined,
                }}
              >
                <div className="h-2.5 w-14 rounded-full bg-white/20" />
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <div className="h-2.5 w-11 rounded-full bg-white/15" />
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <div className="h-2.5 w-12 rounded-full bg-white/15" />
              </div>
            </div>
          </div>

          <div className="flex-1 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-1">
                <div
                  className="h-3 w-24 rounded-full"
                  style={{ backgroundColor: `${theme.palette.accent}55` }}
                />
                <div
                  className="h-2.5 w-40 rounded-full"
                  style={{ backgroundColor: `${theme.preview.text}22` }}
                />
              </div>
              <div
                className="rounded-xl px-3 py-1.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${theme.palette.primary}22`,
                  color: theme.palette.primary,
                }}
              >
                {theme.label}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Object.values(theme.palette).map((color) => (
                <div
                  key={color}
                  className="h-14 rounded-xl border"
                  style={{
                    backgroundColor: color,
                    borderColor: `${theme.preview.text}12`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Object.values(theme.palette).map((color) => (
            <span
              key={color}
              className="h-6 w-6 rounded-full border border-white/10 shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-blue-600">{isActive ? "현재 적용됨" : "클릭해서 적용"}</span>
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();
  const { currentTheme, themeId, themes, setTheme } = useTheme();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [router, status]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">로딩중...</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <DashboardShell title="설정">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">테마 설정</h1>
          <p className="mt-2 text-sm text-gray-500">
            공통 레이아웃과 카드, 사이드바, 헤더 같은 기본 UI가 선택한 테마를 따라갑니다.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">현재 테마</h2>
              <p className="mt-1 text-sm text-gray-500">
                <span className="font-medium text-gray-900">{currentTheme.label}</span>
                {" · "}
                {currentTheme.description}
              </p>
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
              새 테마를 추가하면 이 목록에서 바로 선택할 수 있습니다.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === themeId}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

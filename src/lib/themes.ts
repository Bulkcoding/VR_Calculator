export type ThemeId = "classic" | "theme-2";

export interface AppTheme {
  id: ThemeId;
  label: string;
  description: string;
  appearance: "light" | "dark";
  palette: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    danger: string;
  };
  preview: {
    shell: string;
    sidebar: string;
    panel: string;
    highlight: string;
    text: string;
  };
}

export const THEME_STORAGE_KEY = "vr-dashboard-theme";

export const DEFAULT_THEME_ID: ThemeId = "classic";

export const appThemes: AppTheme[] = [
  {
    id: "classic",
    label: "Current Theme",
    description: "현재 사용 중인 밝은 기본 테마입니다.",
    appearance: "light",
    palette: {
      background: "#f5f7fb",
      surface: "#ffffff",
      primary: "#2563eb",
      accent: "#6366f1",
      danger: "#ef4444",
    },
    preview: {
      shell: "linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)",
      sidebar: "#ffffff",
      panel: "#ffffff",
      highlight: "#dbeafe",
      text: "#111827",
    },
  },
  {
    id: "theme-2",
    label: "Theme 2",
    description: "요청하신 다크 대시보드 톤입니다. 보라와 민트 포인트를 사용합니다.",
    appearance: "dark",
    palette: {
      background: "#0d1117",
      surface: "#1a2230",
      primary: "#6546ff",
      accent: "#47e3d5",
      danger: "#ff7b7b",
    },
    preview: {
      shell: "linear-gradient(135deg, #0d1117 0%, #111c2b 100%)",
      sidebar: "#121926",
      panel: "#182232",
      highlight: "#6546ff",
      text: "#f4f7fb",
    },
  },
];

const themeIds = new Set<ThemeId>(appThemes.map((theme) => theme.id));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return typeof value === "string" && themeIds.has(value as ThemeId);
}

export function resolveThemeId(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function getThemeById(themeId: ThemeId): AppTheme {
  return appThemes.find((theme) => theme.id === themeId) ?? appThemes[0];
}

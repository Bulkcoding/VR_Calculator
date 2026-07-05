export type ThemeId = "classic" | "green" | "theme-2";

export interface AppTheme {
  id: ThemeId;
  label: string;
  description: string;
  appearance: "light" | "dark";
  branding: {
    wordmarkSrc: string;
  };
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
    label: "Light Theme",
    description: "Clean light surfaces with blue accents.",
    appearance: "light",
    branding: {
      wordmarkSrc: "/branding/revalue-light.png",
    },
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
    id: "green",
    label: "Green Theme",
    description: "Warm ivory surfaces with calm green highlights.",
    appearance: "light",
    branding: {
      wordmarkSrc: "/branding/revalue-green.png",
    },
    palette: {
      background: "#f7f4ea",
      surface: "#fffdf7",
      primary: "#3f7440",
      accent: "#8baa5e",
      danger: "#cf5b5b",
    },
    preview: {
      shell: "linear-gradient(135deg, #fcfaf4 0%, #f4efdf 100%)",
      sidebar: "#fffaf0",
      panel: "#fffdf7",
      highlight: "#dce8c9",
      text: "#1c241b",
    },
  },
  {
    id: "theme-2",
    label: "Dark Theme",
    description: "Deep dark surfaces with vivid neon accents.",
    appearance: "dark",
    branding: {
      wordmarkSrc: "/branding/revalue-dark.png",
    },
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

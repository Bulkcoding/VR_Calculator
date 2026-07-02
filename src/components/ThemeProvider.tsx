"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import {
  appThemes,
  DEFAULT_THEME_ID,
  getThemeById,
  resolveThemeId,
  THEME_STORAGE_KEY,
  type AppTheme,
  type ThemeId,
} from "@/lib/themes";

interface ThemeContextValue {
  themeId: ThemeId;
  currentTheme: AppTheme;
  themes: readonly AppTheme[];
  setTheme: (themeId: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME_ID;
    }

    return resolveThemeId(window.localStorage.getItem(THEME_STORAGE_KEY));
  });

  useLayoutEffect(() => {
    const theme = getThemeById(themeId);
    const root = document.documentElement;

    root.dataset.theme = themeId;
    root.style.colorScheme = theme.appearance;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const value = useMemo(
    () => ({
      themeId,
      currentTheme: getThemeById(themeId),
      themes: appThemes,
      setTheme: setThemeId,
    }),
    [themeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

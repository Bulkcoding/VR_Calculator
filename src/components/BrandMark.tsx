"use client";

import { useTheme } from "@/components/ThemeProvider";

interface BrandMarkProps {
  className?: string;
}

export default function BrandMark({ className = "h-10 w-10 rounded-2xl" }: BrandMarkProps) {
  const { currentTheme } = useTheme();

  return (
    <div
      className={`flex items-center justify-center text-lg font-black text-white shadow-sm ${className}`}
      style={{
        background: `linear-gradient(135deg, ${currentTheme.palette.primary}, ${currentTheme.palette.accent})`,
        boxShadow:
          currentTheme.appearance === "dark"
            ? `0 10px 24px ${currentTheme.palette.primary}44`
            : `0 10px 20px ${currentTheme.palette.primary}22`,
      }}
      aria-hidden="true"
    >
      R
    </div>
  );
}

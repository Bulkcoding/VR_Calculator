"use client";

import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import { getThemeById, type ThemeId } from "@/lib/themes";

interface BrandWordmarkProps {
  themeId?: ThemeId;
  className?: string;
  priority?: boolean;
}

export default function BrandWordmark({
  themeId,
  className = "h-7 w-auto",
  priority = false,
}: BrandWordmarkProps) {
  const themeContext = useTheme();
  const theme = getThemeById(themeId ?? themeContext.themeId);

  return (
    <Image
      src={theme.branding.wordmarkSrc}
      alt="ReValue"
      width={1983}
      height={793}
      priority={priority}
      className={className}
    />
  );
}

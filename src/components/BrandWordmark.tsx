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
  className = "h-auto w-[150px]",
  priority = false,
}: BrandWordmarkProps) {
  const themeContext = useTheme();
  const theme = getThemeById(themeId ?? themeContext.themeId);

  return (
    <Image
      src={theme.branding.wordmarkSrc}
      alt="ReValue"
      width={790}
      height={316}
      priority={priority}
      className={className}
    />
  );
}

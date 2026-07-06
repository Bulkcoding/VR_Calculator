import { redirect } from "next/navigation";

import { auth } from "@/auth";
import ThemeExplorer from "@/components/ThemeExplorer";
import { fetchThemeExplorerData } from "@/lib/themeApi";

export default async function ThemesPage() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { themes, selectedTheme } = await fetchThemeExplorerData();

  return (
    <ThemeExplorer
      themes={themes}
      selectedTheme={selectedTheme}
      updatedAt={new Date().toISOString()}
    />
  );
}

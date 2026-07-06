import { redirect } from "next/navigation";

import { auth } from "@/auth";
import ThemeExplorer from "@/components/ThemeExplorer";
import { fetchThemeExplorerData } from "@/lib/themeApi";

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { themeId } = await params;
  const { themes, selectedTheme } = await fetchThemeExplorerData(themeId);

  if (selectedTheme && selectedTheme.id !== themeId) {
    redirect(`/themes/${selectedTheme.id}`);
  }

  return (
    <ThemeExplorer
      themes={themes}
      selectedTheme={selectedTheme}
      updatedAt={new Date().toISOString()}
    />
  );
}

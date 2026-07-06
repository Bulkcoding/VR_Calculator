import {
  extractCells,
  extractTableRows,
  fetchNaverHtml,
  parseGroupStocks,
  parseNumber,
  textFromHtml,
  type NaverGroupStock,
} from "@/lib/naverMarketApi";

export interface ThemeSummary {
  id: string;
  name: string;
  changeRate: number;
  recentThreeDayRate: number;
  upCount: number;
  flatCount: number;
  downCount: number;
}

export interface ThemeRanking extends ThemeSummary {
  stocks: NaverGroupStock[];
}

function parseThemeList(html: string, limit: number): ThemeSummary[] {
  const themes: ThemeSummary[] = [];

  for (const row of extractTableRows(html, "type_1")) {
    const link = row.match(/sise_group_detail\.naver\?type=theme(?:&amp;|&)no=(\d+)/i);
    const cells = extractCells(row);
    if (!link || cells.length < 6) continue;

    themes.push({
      id: link[1],
      name: textFromHtml(cells[0]),
      changeRate: parseNumber(cells[1]),
      recentThreeDayRate: parseNumber(cells[2]),
      upCount: parseNumber(cells[3]),
      flatCount: parseNumber(cells[4]),
      downCount: parseNumber(cells[5]),
    });

    if (themes.length >= limit) break;
  }

  return themes;
}

export async function fetchThemeSummaries(limit = 6): Promise<ThemeSummary[]> {
  const listHtml = await fetchNaverHtml("/sise/theme.naver?field=change_rate&ordering=desc");
  const themes = parseThemeList(listHtml, limit);

  if (themes.length === 0) {
    throw new Error("Naver Finance theme table could not be parsed");
  }

  return themes;
}

export async function fetchThemeStocks(themeId: string, limit = 3): Promise<NaverGroupStock[]> {
  const detailHtml = await fetchNaverHtml(`/sise/sise_group_detail.naver?type=theme&no=${themeId}`);
  return parseGroupStocks(detailHtml, limit);
}

export async function fetchThemeExplorerData(
  selectedThemeId?: string,
  summaryLimit = 20,
  stockLimit = 24,
): Promise<{ themes: ThemeSummary[]; selectedTheme: ThemeRanking | null }> {
  const themes = await fetchThemeSummaries(summaryLimit);
  const summary = themes.find((theme) => theme.id === selectedThemeId) ?? themes[0] ?? null;

  if (!summary) {
    return { themes: [], selectedTheme: null };
  }

  try {
    const stocks = await fetchThemeStocks(summary.id, stockLimit);
    return {
      themes,
      selectedTheme: {
        ...summary,
        stocks,
      },
    };
  } catch {
    return {
      themes,
      selectedTheme: {
        ...summary,
        stocks: [],
      },
    };
  }
}

export async function fetchThemeRankings(limit = 6): Promise<ThemeRanking[]> {
  const themes = await fetchThemeSummaries(limit);

  return Promise.all(
    themes.map(async (theme) => {
      try {
        const stocks = await fetchThemeStocks(theme.id);
        return { ...theme, stocks };
      } catch {
        return { ...theme, stocks: [] };
      }
    })
  );
}

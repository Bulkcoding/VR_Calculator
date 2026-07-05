import {
  extractCells,
  extractTableRows,
  fetchNaverHtml,
  parseGroupStocks,
  parseNumber,
  textFromHtml,
  type NaverGroupStock,
} from "@/lib/naverMarketApi";

export interface ThemeRanking {
  id: string;
  name: string;
  changeRate: number;
  recentThreeDayRate: number;
  upCount: number;
  flatCount: number;
  downCount: number;
  stocks: NaverGroupStock[];
}

type ThemeSummary = Omit<ThemeRanking, "stocks">;

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

export async function fetchThemeRankings(limit = 6): Promise<ThemeRanking[]> {
  const listHtml = await fetchNaverHtml("/sise/theme.naver?field=change_rate&ordering=desc");
  const themes = parseThemeList(listHtml, limit);
  if (themes.length === 0) {
    throw new Error("Naver Finance theme table could not be parsed");
  }

  return Promise.all(
    themes.map(async (theme) => {
      try {
        const detailHtml = await fetchNaverHtml(
          `/sise/sise_group_detail.naver?type=theme&no=${theme.id}`
        );
        return { ...theme, stocks: parseGroupStocks(detailHtml) };
      } catch {
        return { ...theme, stocks: [] };
      }
    })
  );
}

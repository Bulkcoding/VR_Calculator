import {
  extractCells,
  extractTableRows,
  fetchNaverHtml,
  parseGroupStocks,
  parseNumber,
  textFromHtml,
  type NaverGroupStock,
} from "@/lib/naverMarketApi";

export interface IndustryRanking {
  id: string;
  name: string;
  changeRate: number;
  stockCount: number;
  upCount: number;
  flatCount: number;
  downCount: number;
  representativeStocks: NaverGroupStock[];
}

type IndustrySummary = Omit<IndustryRanking, "representativeStocks">;

function parseIndustryList(html: string, limit: number): IndustrySummary[] {
  const industries: IndustrySummary[] = [];

  for (const row of extractTableRows(html, "type_1")) {
    const link = row.match(/sise_group_detail\.naver\?type=upjong(?:&amp;|&)no=(\d+)/i);
    const cells = extractCells(row);
    if (!link || cells.length < 6) continue;

    industries.push({
      id: link[1],
      name: textFromHtml(cells[0]),
      changeRate: parseNumber(cells[1]),
      stockCount: parseNumber(cells[2]),
      upCount: parseNumber(cells[3]),
      flatCount: parseNumber(cells[4]),
      downCount: parseNumber(cells[5]),
    });

    if (industries.length >= limit) break;
  }

  return industries;
}

export async function fetchIndustryRankings(limit = 6): Promise<IndustryRanking[]> {
  const listHtml = await fetchNaverHtml("/sise/sise_group.naver?type=upjong");
  const industries = parseIndustryList(listHtml, limit);
  if (industries.length === 0) {
    throw new Error("Naver Finance industry table could not be parsed");
  }

  return Promise.all(
    industries.map(async (industry) => {
      try {
        const detailHtml = await fetchNaverHtml(
          `/sise/sise_group_detail.naver?type=upjong&no=${industry.id}`
        );
        return { ...industry, representativeStocks: parseGroupStocks(detailHtml) };
      } catch {
        return { ...industry, representativeStocks: [] };
      }
    })
  );
}

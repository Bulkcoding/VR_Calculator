export type VrMode = "lump" | "contribution" | "withdrawal";
export type BandPreset = 10 | 15 | 20;

export interface VrParams {
  vValue: number;
  bandPreset: BandPreset;
  bandPct: number;
  divisorG: number;
  contribution: number;
  withdrawal: number;
  pool: number;
  currentQty: number;
  mode: VrMode;
  advanced: boolean;
}

export interface PriceRow {
  step: number;
  unit: number;
  qty: number;
  price: number;
  pool: number;
  cumAmount: number;
}

export interface VrResult {
  minBand: number;
  maxBand: number;
  buyTable: PriceRow[];
  sellTable: PriceRow[];
  poolCap: number;
}

export interface CycleContext {
  prevEndEval: number | null;
  currentPrice: number;
  qty: number;
  startDate: Date;
  endDate: Date;
}

export const PRESET_TO_PCT: Record<BandPreset, number> = { 10: 0.1, 15: 0.15, 20: 0.2 };

export const BAND_PRESETS: BandPreset[] = [10, 15, 20];

export const MAX_SCHEDULE_ROWS = 30;

export function calculateVr(
  params: VrParams,
  options: { buyUnits?: number[]; sellUnits?: number[]; maxRows?: number } = {}
): VrResult {
  const { vValue, bandPct, pool, currentQty } = params;
  const { buyUnits = [], sellUnits = [], maxRows = MAX_SCHEDULE_ROWS } = options;

  const minBand = vValue * (1 - bandPct);
  const maxBand = vValue * (1 + bandPct);
  const poolCap = pool * 0.75;

  const buyTable: PriceRow[] = [];
  let buyPool = pool;
  let buyQty = currentQty;
  let cumAmount = 0;
  for (let i = 0; i < maxRows; i++) {
    const unit = Math.floor(buyUnits[i] ?? 1);
    if (buyQty <= 0) break;
    const price = minBand / buyQty;
    if (unit > 0) {
      const cost = price * unit;
      if (cost > buyPool || cost > poolCap) break;
      buyQty += unit;
      buyPool -= cost;
      cumAmount += cost;
    }
    buyTable.push({
      step: i + 1,
      unit,
      qty: Number(buyQty.toFixed(2)),
      price: Number(price.toFixed(2)),
      pool: Number(buyPool.toFixed(2)),
      cumAmount: Number(cumAmount.toFixed(2)),
    });
  }

  const sellTable: PriceRow[] = [];
  let sellPool = pool;
  let sellQty = currentQty;
  let sCumAmount = 0;
  for (let i = 0; i < maxRows; i++) {
    const unit = Math.floor(sellUnits[i] ?? 1);
    if (sellQty <= 0) break;
    const price = maxBand / sellQty;
    if (price < 1) break;
    if (unit > 0) {
      if (sellQty - unit < 1) break;
      const proceeds = price * unit;
      sellQty -= unit;
      if (sellQty < 0) sellQty = 0;
      sellPool += proceeds;
      sCumAmount += proceeds;
    }
    sellTable.push({
      step: i + 1,
      unit,
      qty: Number(sellQty.toFixed(2)),
      price: Number(price.toFixed(2)),
      pool: Number(sellPool.toFixed(2)),
      cumAmount: Number(sCumAmount.toFixed(2)),
    });
  }

  return {
    minBand: Number(minBand.toFixed(2)),
    maxBand: Number(maxBand.toFixed(2)),
    buyTable,
    sellTable,
    poolCap: Number(poolCap.toFixed(2)),
  };
}

export function nextVValue(
  prevV: number,
  pool: number,
  divisorG: number,
  contribution: number,
  withdrawal: number,
  mode: VrMode,
  advanced: boolean,
  endEval: number | null,
): number {
  if (advanced && endEval !== null) {
    const base = 21 + pool / divisorG + (endEval - prevV) / (2 * Math.sqrt(10));
    return Number(base.toFixed(2));
  }
  const lump = prevV + pool / divisorG;
  if (mode === "contribution") return Number((lump + contribution).toFixed(2));
  if (mode === "withdrawal") return Number((lump - withdrawal).toFixed(2));
  return Number(lump.toFixed(2));
}

export function prevStartEval(
  prevEndEval: number | null,
  prevStartQty: number | null,
  prevStartPrice: number | null,
  qty: number,
  startPrice: number,
): number {
  if (prevEndEval !== null) return prevEndEval;
  if (prevStartQty !== null && prevStartPrice !== null) return prevStartQty * prevStartPrice;
  return qty * startPrice;
}

export const MODE_LABELS: Record<VrMode, string> = {
  lump: "거치식",
  contribution: "적립식",
  withdrawal: "인출식",
};

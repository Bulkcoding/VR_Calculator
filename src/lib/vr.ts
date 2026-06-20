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
  tradeUnit: number;
  advanced: boolean;
}

export interface PriceRow {
  qty: number;
  price: number;
  pool: number;
  cumQty: number;
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

export function calculateVr(params: VrParams): VrResult {
  const {
    vValue, bandPct, divisorG, currentQty, pool, tradeUnit,
  } = params;

  const minBand = vValue * (1 - bandPct);
  const maxBand = vValue * (1 + bandPct);

  const unit = Math.max(1, Math.floor(tradeUnit || 1));
  const poolCap = pool * 0.75;

  const buyTable: PriceRow[] = [];
  const sellTable: PriceRow[] = [];

  let buyPool = pool;
  let buyQty = currentQty;
  let cumQty = 0;
  let cumAmount = 0;
  for (let i = 0; i < 30; i++) {
    const unitPrice = minBand / buyQty;
    const cost = unitPrice * unit;
    if (cost > buyPool || cost > poolCap) break;
    buyQty += unit;
    buyPool -= cost;
    cumQty += unit;
    cumAmount += cost;
    buyTable.push({ qty: buyQty, price: Number(unitPrice.toFixed(2)), pool: Number(buyPool.toFixed(2)), cumQty, cumAmount: Number(cumAmount.toFixed(2)) });
  }

  let sellPool = pool;
  let sellQty = currentQty;
  let sCumQty = 0;
  let sCumAmount = 0;
  for (let i = 0; i < 30; i++) {
    if (sellQty <= 0) break;
    const unitPrice = maxBand / sellQty;
    const proceeds = unitPrice * unit;
    sellQty -= unit;
    sellPool += proceeds;
    sCumQty += unit;
    sCumAmount += proceeds;
    sellTable.push({ qty: Math.max(0, sellQty), price: Number(unitPrice.toFixed(2)), pool: Number(sellPool.toFixed(2)), cumQty: sCumQty, cumAmount: Number(sCumAmount.toFixed(2)) });
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

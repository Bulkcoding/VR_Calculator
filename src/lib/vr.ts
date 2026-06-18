export interface VrParams {
  vValue: number;
  bandPct: number;
  divisorG: number;
  contribution: number;
  pool: number;
  currentQty: number;
}

export interface PriceRow {
  qty: number;
  price: number;
  pool: number;
}

export interface VrResult {
  minBand: number;
  maxBand: number;
  buyTable: PriceRow[];
  sellTable: PriceRow[];
}

export function calculateVr(params: VrParams): VrResult {
  const { vValue, bandPct, divisorG, contribution, pool, currentQty } = params;

  const minBand = vValue * (1 - bandPct);
  const maxBand = vValue * (1 + bandPct);

  const buyTable: PriceRow[] = [];
  const sellTable: PriceRow[] = [];

  // Buy table: price drops → fractional buying
  let buyPool = pool;
  let buyQty = currentQty;
  for (let i = 0; i < 20; i++) {
    const buyPoint = minBand / buyQty;
    if (buyPool < buyPoint) break;
    buyQty += 1;
    buyPool -= buyPoint;
    buyTable.push({ qty: buyQty, price: Number(buyPoint.toFixed(2)), pool: Number(buyPool.toFixed(2)) });
  }

  // Sell table: price rises → fractional selling
  let sellPool = pool;
  let sellQty = currentQty;
  for (let i = 0; i < 20; i++) {
    const sellPoint = maxBand / sellQty;
    if (sellQty <= 0) break;
    sellQty -= 1;
    sellPool += sellPoint;
    sellTable.push({ qty: sellQty, price: Number(sellPoint.toFixed(2)), pool: Number(sellPool.toFixed(2)) });
  }

  return { minBand: Number(minBand.toFixed(2)), maxBand: Number(maxBand.toFixed(2)), buyTable, sellTable };
}

export function calculateNextCycle(params: VrParams): VrParams {
  const { vValue, bandPct, divisorG, contribution, pool, currentQty } = params;
  const nextV = vValue + (pool / divisorG) + contribution;
  return {
    ...params,
    vValue: Number(nextV.toFixed(2)),
  };
}

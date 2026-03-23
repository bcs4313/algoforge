import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  Stochastic,
} from "technicalindicators";
import type { OHLCVBar } from "../../lib/types";

export interface IndicatorSeries {
  values: (number | null)[];
}

export interface MACDSeries {
  MACD: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export interface BBSeries {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export interface StochasticSeries {
  k: (number | null)[];
  d: (number | null)[];
}

// Pad arrays to match original length
function padLeft<T>(arr: T[], len: number, fill: T): T[] {
  const padding = Array(len - arr.length).fill(fill);
  return [...padding, ...arr];
}

export function computeSMA(bars: OHLCVBar[], period: number): IndicatorSeries {
  const closes = bars.map((b) => b.close);
  const raw = SMA.calculate({ period, values: closes });
  return { values: padLeft<number | null>(raw as number[], bars.length, null) };
}

export function computeEMA(bars: OHLCVBar[], period: number): IndicatorSeries {
  const closes = bars.map((b) => b.close);
  const raw = EMA.calculate({ period, values: closes });
  return { values: padLeft<number | null>(raw as number[], bars.length, null) };
}

export function computeRSI(bars: OHLCVBar[], period: number): IndicatorSeries {
  const closes = bars.map((b) => b.close);
  const raw = RSI.calculate({ period, values: closes });
  return { values: padLeft<number | null>(raw as number[], bars.length, null) };
}

export function computeMACD(
  bars: OHLCVBar[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDSeries {
  const closes = bars.map((b) => b.close);
  const raw = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const MACDVals = padLeft<number | null>(
    raw.map((r) => r.MACD ?? null),
    bars.length,
    null
  );
  const signalVals = padLeft<number | null>(
    raw.map((r) => r.signal ?? null),
    bars.length,
    null
  );
  const histogramVals = padLeft<number | null>(
    raw.map((r) => r.histogram ?? null),
    bars.length,
    null
  );
  return { MACD: MACDVals, signal: signalVals, histogram: histogramVals };
}

export function computeBB(
  bars: OHLCVBar[],
  period: number,
  stdDev: number
): BBSeries {
  const closes = bars.map((b) => b.close);
  const raw = BollingerBands.calculate({ period, stdDev, values: closes });
  const upper = padLeft<number | null>(
    raw.map((r) => r.upper),
    bars.length,
    null
  );
  const middle = padLeft<number | null>(
    raw.map((r) => r.middle),
    bars.length,
    null
  );
  const lower = padLeft<number | null>(
    raw.map((r) => r.lower),
    bars.length,
    null
  );
  return { upper, middle, lower };
}

export function computeATR(bars: OHLCVBar[], period: number): IndicatorSeries {
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const closes = bars.map((b) => b.close);
  const raw = ATR.calculate({ high: highs, low: lows, close: closes, period });
  return { values: padLeft<number | null>(raw as number[], bars.length, null) };
}

export function computeStochastic(
  bars: OHLCVBar[],
  kPeriod: number,
  dPeriod: number
): StochasticSeries {
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const closes = bars.map((b) => b.close);
  const raw = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: kPeriod,
    signalPeriod: dPeriod,
  });
  const k = padLeft<number | null>(
    raw.map((r) => r.k),
    bars.length,
    null
  );
  const d = padLeft<number | null>(
    raw.map((r) => r.d),
    bars.length,
    null
  );
  return { k, d };
}

export function computeVWAP(bars: OHLCVBar[]): IndicatorSeries {
  // Running VWAP
  let cumVolPrice = 0;
  let cumVol = 0;
  const values: (number | null)[] = bars.map((b) => {
    const typicalPrice = (b.high + b.low + b.close) / 3;
    cumVolPrice += typicalPrice * b.volume;
    cumVol += b.volume;
    return cumVol === 0 ? null : cumVolPrice / cumVol;
  });
  return { values };
}

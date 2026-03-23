import type { OHLCVBar, Rule, StrategyRules } from "../../lib/types";
import {
  computeSMA,
  computeEMA,
  computeRSI,
  computeMACD,
  computeBB,
  computeATR,
  computeStochastic,
  computeVWAP,
} from "./indicators";

export interface BarSignal {
  index: number;
  date: string;
  close: number;
  signal: "BUY" | "SELL" | null;
}

type ComputedIndicators = Record<string, (number | null)[]>;

function getIndicatorValues(
  rule: Rule,
  bars: OHLCVBar[],
  cache: Map<string, ComputedIndicators>
): { primary: (number | null)[]; secondary?: (number | null)[] } {
  const key = `${rule.indicator}-${JSON.stringify(rule.params)}`;
  if (!cache.has(key)) {
    const computed: ComputedIndicators = {};
    const p = rule.params;

    switch (rule.indicator) {
      case "SMA": {
        const r = computeSMA(bars, p.period ?? 20);
        computed["value"] = r.values;
        break;
      }
      case "EMA": {
        const r = computeEMA(bars, p.period ?? 20);
        computed["value"] = r.values;
        break;
      }
      case "RSI": {
        const r = computeRSI(bars, p.period ?? 14);
        computed["value"] = r.values;
        break;
      }
      case "MACD": {
        const r = computeMACD(bars, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9);
        computed["MACD"] = r.MACD;
        computed["signal"] = r.signal;
        break;
      }
      case "BB": {
        const r = computeBB(bars, p.period ?? 20, p.stdDev ?? 2);
        computed["upper"] = r.upper;
        computed["lower"] = r.lower;
        computed["middle"] = r.middle;
        break;
      }
      case "ATR": {
        const r = computeATR(bars, p.period ?? 14);
        computed["value"] = r.values;
        break;
      }
      case "Stochastic": {
        const r = computeStochastic(bars, p.kPeriod ?? 14, p.dPeriod ?? 3);
        computed["k"] = r.k;
        computed["d"] = r.d;
        break;
      }
      case "VWAP": {
        const r = computeVWAP(bars);
        computed["value"] = r.values;
        break;
      }
    }
    cache.set(key, computed);
  }

  const computed = cache.get(key)!;

  // Pick primary/secondary series based on indicator
  switch (rule.indicator) {
    case "MACD":
      return { primary: computed["MACD"]!, secondary: computed["signal"]! };
    case "BB":
      if (rule.threshold === "upper") return { primary: computed["upper"]! };
      if (rule.threshold === "lower") return { primary: computed["lower"]! };
      return { primary: computed["middle"]! };
    case "Stochastic":
      return { primary: computed["k"]!, secondary: computed["d"]! };
    default:
      return { primary: computed["value"]! };
  }
}

function evaluateRule(
  rule: Rule,
  i: number,
  bars: OHLCVBar[],
  cache: Map<string, ComputedIndicators>
): boolean {
  if (i < 1) return false;
  const { primary, secondary } = getIndicatorValues(rule, bars, cache);

  const current = primary[i];
  const prev = primary[i - 1];
  if (current === null || current === undefined) return false;

  const close = bars[i].close;

  // Determine comparison value
  let compareVal: number;
  if (typeof rule.threshold === "number") {
    compareVal = rule.threshold;
  } else if (rule.threshold === "signal" && secondary) {
    const sig = secondary[i];
    if (sig === null || sig === undefined) return false;
    compareVal = sig;
  } else {
    // upper/lower/middle already selected in primary
    compareVal = close;
  }

  switch (rule.operator) {
    case "greater_than":
      return current > compareVal;
    case "less_than":
      return current < compareVal;
    case "crosses_above": {
      const prevCompare =
        typeof rule.threshold === "number"
          ? rule.threshold
          : secondary
          ? (secondary[i - 1] ?? 0)
          : bars[i - 1].close;
      return (prev ?? 0) <= prevCompare && current > compareVal;
    }
    case "crosses_below": {
      const prevCompare =
        typeof rule.threshold === "number"
          ? rule.threshold
          : secondary
          ? (secondary[i - 1] ?? 0)
          : bars[i - 1].close;
      return (prev ?? 0) >= prevCompare && current < compareVal;
    }
    default:
      return false;
  }
}

export function generateSignals(
  bars: OHLCVBar[],
  rules: StrategyRules
): BarSignal[] {
  const cache = new Map<string, ComputedIndicators>();
  const signals: BarSignal[] = [];

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i];
    let signal: "BUY" | "SELL" | null = null;

    const buyMet =
      rules.buy.length > 0 &&
      rules.buy.every((rule) => evaluateRule(rule, i, bars, cache));
    const sellMet =
      rules.sell.length > 0 &&
      rules.sell.every((rule) => evaluateRule(rule, i, bars, cache));

    if (buyMet) signal = "BUY";
    else if (sellMet) signal = "SELL";

    signals.push({ index: i, date: bar.date, close: bar.close, signal });
  }

  return signals;
}

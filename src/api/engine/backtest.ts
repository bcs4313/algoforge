import type {
  OHLCVBar,
  StrategyRules,
  Trade,
  BacktestResult,
  EquityPoint,
} from "../../lib/types";
import { generateSignals } from "./signals";

interface SimResult {
  finalEquity: number;
  equityCurve: number[];
  trades: Trade[];
}

function simulateOnce(
  pnlList: number[],
  initialCapital: number
): { finalEquity: number; equityCurve: number[] } {
  let equity = initialCapital;
  const curve: number[] = [equity];
  for (const pnl of pnlList) {
    equity += pnl;
    curve.push(equity);
  }
  return { finalEquity: equity, equityCurve: curve };
}

// Buy & hold: buy on day 1, sell on last day — equity tracks price proportionally
function computeBuyAndHold(bars: OHLCVBar[], initialCapital: number): number[] {
  if (bars.length === 0) return [initialCapital];
  const startPrice = bars[0].close;
  return bars.map((b) => (b.close / startPrice) * initialCapital);
}

function runActualBacktest(
  bars: OHLCVBar[],
  rules: StrategyRules,
  initialCapital: number
): SimResult {
  const signals = generateSignals(bars, rules);
  const trades: Trade[] = [];
  let cash = initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let portfolioValue = initialCapital;

  for (const sig of signals) {
    if (sig.signal === "BUY" && shares === 0) {
      shares = Math.floor(cash / sig.close);
      if (shares > 0) {
        entryPrice = sig.close;
        cash -= shares * sig.close;
        portfolioValue = cash + shares * sig.close;
        trades.push({
          date: sig.date,
          action: "BUY",
          price: sig.close,
          shares,
          pnl: -(shares * sig.close),
          portfolioValue,
        });
      }
    } else if (sig.signal === "SELL" && shares > 0) {
      const proceeds = shares * sig.close;
      const pnl = (sig.close - entryPrice) * shares;
      cash += proceeds;
      portfolioValue = cash;
      trades.push({
        date: sig.date,
        action: "SELL",
        price: sig.close,
        shares,
        pnl,
        portfolioValue,
      });
      shares = 0;
    }
  }

  // Close any open position at last bar
  if (shares > 0 && bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    const proceeds = shares * lastBar.close;
    const pnl = (lastBar.close - entryPrice) * shares;
    cash += proceeds;
    portfolioValue = cash;
    trades.push({
      date: lastBar.date,
      action: "SELL",
      price: lastBar.close,
      shares,
      pnl,
      portfolioValue,
    });
  }

  const equityCurve: number[] = [initialCapital];
  for (const trade of trades) {
    equityCurve.push(trade.portfolioValue);
  }

  return { finalEquity: portfolioValue, equityCurve, trades };
}

function computeSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return (mean / stdDev) * Math.sqrt(252);
}

function computeMaxDrawdown(equityCurve: number[]): number {
  let maxDrawdown = 0;
  let peak = equityCurve[0];
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const drawdown = (peak - val) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function runBacktest(
  bars: OHLCVBar[],
  rules: StrategyRules,
  initialCapital = 10000,
  iterations = 500
): BacktestResult {
  const actual = runActualBacktest(bars, rules, initialCapital);
  const buyAndHoldCurve = computeBuyAndHold(bars, initialCapital);
  const buyAndHoldFinal = buyAndHoldCurve[buyAndHoldCurve.length - 1];
  const buyAndHoldReturn = ((buyAndHoldFinal - initialCapital) / initialCapital) * 100;

  const tradePnLs = actual.trades
    .filter((t) => t.action === "SELL")
    .map((t) => t.pnl);

  // No trades — still return buy & hold
  if (tradePnLs.length === 0) {
    const bah = buyAndHoldCurve.map((v, i) => ({
      date: bars[i]?.date ?? "",
      p10: initialCapital,
      p50: initialCapital,
      p90: initialCapital,
      buyAndHold: v,
    }));
    return {
      stats: {
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        probabilityOfRuin: 0,
        medianReturn: 0,
        totalTrades: 0,
        buyAndHoldReturn: Math.round(buyAndHoldReturn * 10) / 10,
      },
      equityCurve: bah,
      returnDistribution: [initialCapital],
      trades: [],
    };
  }

  // Monte Carlo
  const finalEquities: number[] = [];
  const allCurves: number[][] = [];

  for (let iter = 0; iter < iterations; iter++) {
    const resampled: number[] = Array.from(
      { length: tradePnLs.length },
      () => tradePnLs[Math.floor(Math.random() * tradePnLs.length)]
    );
    const { finalEquity, equityCurve } = simulateOnce(resampled, initialCapital);
    finalEquities.push(finalEquity);
    allCurves.push(equityCurve);
  }

  // Align MC curves
  const maxLen = Math.max(...allCurves.map((c) => c.length));
  const aligned = allCurves.map((c) => {
    while (c.length < maxLen) c.push(c[c.length - 1]);
    return c;
  });

  // Build buy & hold interpolated to same number of points as MC curves
  // Map each MC step index to a proportional position in the price series
  const bahInterpolated = Array.from({ length: maxLen }, (_, i) => {
    const ratio = i / Math.max(maxLen - 1, 1);
    const barIdx = Math.round(ratio * (bars.length - 1));
    return buyAndHoldCurve[barIdx];
  });

  // Trade dates for x-axis
  const tradeDates = [bars[0].date, ...actual.trades.map((t) => t.date)];

  const equityCurve: EquityPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    const vals = aligned.map((c) => c[i]);
    const dateLabel = tradeDates[i] ?? tradeDates[tradeDates.length - 1];
    equityCurve.push({
      date: dateLabel,
      p10: percentile(vals, 10),
      p50: percentile(vals, 50),
      p90: percentile(vals, 90),
      buyAndHold: Math.round(bahInterpolated[i] * 100) / 100,
    });
  }

  // Stats
  const wins = tradePnLs.filter((p) => p > 0).length;
  const winRate = (wins / tradePnLs.length) * 100;
  const maxDrawdown = computeMaxDrawdown(actual.equityCurve);
  const tradeReturns = tradePnLs.map((pnl) => pnl / initialCapital);
  const sharpeRatio = computeSharpe(tradeReturns);
  const probabilityOfRuin =
    (finalEquities.filter((e) => e < initialCapital * 0.5).length / finalEquities.length) * 100;
  const medianFinalEquity = percentile(finalEquities, 50);
  const medianReturn = ((medianFinalEquity - initialCapital) / initialCapital) * 100;

  return {
    stats: {
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      winRate: Math.round(winRate * 10) / 10,
      probabilityOfRuin: Math.round(probabilityOfRuin * 10) / 10,
      medianReturn: Math.round(medianReturn * 10) / 10,
      totalTrades: actual.trades.filter((t) => t.action === "SELL").length,
      buyAndHoldReturn: Math.round(buyAndHoldReturn * 10) / 10,
    },
    equityCurve,
    returnDistribution: finalEquities,
    trades: actual.trades,
  };
}

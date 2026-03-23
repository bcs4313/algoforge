import type {
  OHLCVBar,
  StrategyRules,
  Trade,
  BacktestStats,
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
  bars: OHLCVBar[],
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
          pnl: 0,
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

  // Build equity curve from trades
  const equityCurve: number[] = [initialCapital];
  let runningEquity = initialCapital;
  for (const trade of trades) {
    runningEquity = trade.portfolioValue;
    equityCurve.push(runningEquity);
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
  // Annualize assuming daily returns (252 trading days)
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
  iterations = 1000
): BacktestResult {
  // Run actual deterministic backtest
  const actual = runActualBacktest(bars, rules, initialCapital);

  // Get per-trade pnls for Monte Carlo resampling
  const tradePnLs = actual.trades
    .filter((t) => t.action === "SELL")
    .map((t) => t.pnl);

  // If no trades, return empty result
  if (tradePnLs.length === 0) {
    return {
      stats: {
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        probabilityOfRuin: 0,
        medianReturn: 0,
        totalTrades: 0,
      },
      equityCurve: [{ date: bars[0]?.date ?? "", p10: initialCapital, p50: initialCapital, p90: initialCapital }],
      returnDistribution: [initialCapital],
      trades: [],
    };
  }

  // Monte Carlo: resample trade PnL order
  const finalEquities: number[] = [];
  const allCurves: number[][] = [];

  for (let iter = 0; iter < iterations; iter++) {
    // Resample with replacement
    const resampled: number[] = Array.from(
      { length: tradePnLs.length },
      () => tradePnLs[Math.floor(Math.random() * tradePnLs.length)]
    );
    const { finalEquity, equityCurve } = simulateOnce(bars, resampled, initialCapital);
    finalEquities.push(finalEquity);
    allCurves.push(equityCurve);
  }

  // Align equity curves (pad shorter ones)
  const maxLen = Math.max(...allCurves.map((c) => c.length));
  const aligned = allCurves.map((c) => {
    while (c.length < maxLen) c.push(c[c.length - 1]);
    return c;
  });

  // Build percentile equity curve
  const equityCurve: EquityPoint[] = [];
  // Use trade dates for x-axis labels
  const tradeDates = [bars[0].date, ...actual.trades.map((t) => t.date)];
  for (let i = 0; i < maxLen; i++) {
    const vals = aligned.map((c) => c[i]);
    const dateLabel = tradeDates[i] ?? tradeDates[tradeDates.length - 1];
    equityCurve.push({
      date: dateLabel,
      p10: percentile(vals, 10),
      p50: percentile(vals, 50),
      p90: percentile(vals, 90),
    });
  }

  // Stats
  const wins = tradePnLs.filter((p) => p > 0).length;
  const winRate = tradePnLs.length > 0 ? (wins / tradePnLs.length) * 100 : 0;
  const maxDrawdown = computeMaxDrawdown(actual.equityCurve);

  // Sharpe from daily-ish returns (between actual trades)
  const tradeReturns = tradePnLs.map((pnl) => pnl / initialCapital);
  const sharpeRatio = computeSharpe(tradeReturns);

  const probabilityOfRuin =
    (finalEquities.filter((e) => e < initialCapital * 0.5).length /
      finalEquities.length) *
    100;

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
    },
    equityCurve,
    returnDistribution: finalEquities,
    trades: actual.trades,
  };
}

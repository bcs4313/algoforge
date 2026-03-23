export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BB"
  | "ATR"
  | "Stochastic"
  | "VWAP";

export type Operator =
  | "greater_than"
  | "less_than"
  | "crosses_above"
  | "crosses_below";

export type ThresholdType = number | "signal" | "upper" | "lower";

export interface Rule {
  id: string;
  indicator: IndicatorType;
  params: Record<string, number>;
  operator: Operator;
  threshold: ThresholdType;
}

export interface StrategyRules {
  buy: Rule[];
  sell: Rule[];
}

export interface BacktestRequest {
  ticker: string;
  dateFrom: string;
  dateTo: string;
  rules: StrategyRules;
  initialCapital?: number;
  iterations?: number;
}

export interface Trade {
  date: string;
  action: "BUY" | "SELL";
  price: number;
  shares: number;
  pnl: number;
  portfolioValue: number;
}

export interface EquityPoint {
  date: string;
  p10: number;
  p50: number;
  p90: number;
  buyAndHold: number;
}

export interface BacktestStats {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  probabilityOfRuin: number;
  medianReturn: number;
  totalTrades: number;
  buyAndHoldReturn: number;
}

export interface BacktestResult {
  stats: BacktestStats;
  equityCurve: EquityPoint[];
  returnDistribution: number[];
  trades: Trade[];
}

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

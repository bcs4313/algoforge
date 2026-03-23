import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
  Legend,
} from "recharts";
import type { BacktestResult, Trade } from "../../lib/types";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Target,
  BarChart3,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}

function StatCard({ label, value, subtext, icon, positive, negative }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p
            className={`text-2xl font-bold font-mono ${
              positive ? "text-emerald-400" : negative ? "text-red-400" : "text-white"
            }`}
          >
            {value}
          </p>
          {subtext && <p className="text-xs text-slate-600 mt-0.5">{subtext}</p>}
        </div>
        <div className="text-slate-600">{icon}</div>
      </div>
    </div>
  );
}

const formatCurrency = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

const formatDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.toLocaleString("default", { month: "short" })} '${String(dt.getFullYear()).slice(2)}`;
};

// Build histogram buckets from distribution
function buildHistogram(data: number[], buckets = 30) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const step = (max - min) / buckets;
  const bins: { label: string; count: number; value: number }[] = [];
  for (let i = 0; i < buckets; i++) {
    const lo = min + i * step;
    const hi = lo + step;
    bins.push({
      label: formatCurrency(lo + step / 2),
      count: data.filter((v) => v >= lo && v < hi).length,
      value: lo + step / 2,
    });
  }
  return bins;
}

interface BacktestResultsProps {
  result: BacktestResult;
  initialCapital: number;
}

export function BacktestResults({ result, initialCapital }: BacktestResultsProps) {
  const { stats, equityCurve, returnDistribution, trades } = result;

  const histData = buildHistogram(returnDistribution);
  const medianFinal = initialCapital * (1 + stats.medianReturn / 100);

  // Thin out equity curve for perf
  const step = Math.max(1, Math.floor(equityCurve.length / 80));
  const thinCurve = equityCurve.filter((_, i) => i % step === 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Sharpe Ratio"
          value={stats.sharpeRatio.toFixed(2)}
          subtext="Annualized"
          icon={<Activity className="w-5 h-5" />}
          positive={stats.sharpeRatio > 1}
          negative={stats.sharpeRatio < 0}
        />
        <StatCard
          label="Max Drawdown"
          value={`${stats.maxDrawdown.toFixed(1)}%`}
          subtext="Worst peak→trough"
          icon={<TrendingDown className="w-5 h-5" />}
          negative={stats.maxDrawdown > 20}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subtext={`${stats.totalTrades} trades`}
          icon={<Target className="w-5 h-5" />}
          positive={stats.winRate > 50}
          negative={stats.winRate < 40}
        />
        <StatCard
          label="Prob. of Ruin"
          value={`${stats.probabilityOfRuin.toFixed(1)}%`}
          subtext="MC < 50% capital"
          icon={<Shield className="w-5 h-5" />}
          negative={stats.probabilityOfRuin > 15}
          positive={stats.probabilityOfRuin < 5}
        />
        <StatCard
          label="Median Return"
          value={`${stats.medianReturn > 0 ? "+" : ""}${stats.medianReturn.toFixed(1)}%`}
          subtext={`${formatCurrency(medianFinal)} median`}
          icon={<TrendingUp className="w-5 h-5" />}
          positive={stats.medianReturn > 0}
          negative={stats.medianReturn < 0}
        />
      </div>

      {/* Equity Curve Fan Chart */}
      <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">
            Monte Carlo Equity Curve
          </h3>
          <span className="text-xs text-slate-600 ml-auto">10th / 50th / 90th percentile</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={thinCurve} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <ReferenceLine
              y={initialCapital}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
            />
            {/* 90th */}
            <Line
              type="monotone"
              dataKey="p90"
              stroke="#14b8a6"
              strokeWidth={1}
              dot={false}
              strokeOpacity={0.4}
              name="P90"
            />
            {/* Median */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={false}
              name="Median"
            />
            {/* 10th */}
            <Line
              type="monotone"
              dataKey="p10"
              stroke="#14b8a6"
              strokeWidth={1}
              dot={false}
              strokeOpacity={0.4}
              name="P10"
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#64748b" }}
              iconType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Return Distribution Histogram */}
      <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">
            Final Equity Distribution
          </h3>
          <span className="text-xs text-slate-600 ml-auto">1,000 MC simulations</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 9 }}
              tickLine={false}
              interval={4}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} width={35} />
            <ReferenceLine
              x={formatCurrency(initialCapital)}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v: number) => [v, "Simulations"]}
            />
            <Bar
              dataKey="count"
              fill="#14b8a6"
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
              name="Simulations"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Log */}
      {trades.length > 0 && (
        <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 pb-3">
            <Activity className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Trade Log</h3>
            <span className="text-xs text-slate-600 ml-auto">{trades.length} trades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-white/5 text-slate-500">
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-right px-4 py-2 font-medium">Price</th>
                  <th className="text-right px-4 py-2 font-medium">Shares</th>
                  <th className="text-right px-4 py-2 font-medium">P&L</th>
                  <th className="text-right px-4 py-2 font-medium">Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 50).map((trade: Trade, i: number) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-400 font-mono">{trade.date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          trade.action === "BUY" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {trade.action === "BUY" ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {trade.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-300">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-400">
                      {trade.shares}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${
                        trade.pnl > 0
                          ? "text-emerald-400"
                          : trade.pnl < 0
                          ? "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}
                      {trade.pnl !== 0 ? `$${trade.pnl.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-300">
                      {formatCurrency(trade.portfolioValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trades.length > 50 && (
              <p className="text-center text-xs text-slate-600 py-3">
                Showing 50 of {trades.length} trades
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

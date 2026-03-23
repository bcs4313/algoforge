import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { IndicatorType } from "../../lib/types";

interface IndicatorMeta {
  id: IndicatorType;
  label: string;
  description: string;
  color: string;
  defaultParams: Record<string, number>;
  defaultOperator: string;
  defaultThreshold: number | string;
}

export const INDICATORS: IndicatorMeta[] = [
  {
    id: "SMA",
    label: "SMA",
    description: "Simple Moving Average",
    color: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    defaultParams: { period: 20 },
    defaultOperator: "greater_than",
    defaultThreshold: 0,
  },
  {
    id: "EMA",
    label: "EMA",
    description: "Exponential Moving Average",
    color: "bg-indigo-500/20 border-indigo-500/30 text-indigo-300",
    defaultParams: { period: 20 },
    defaultOperator: "crosses_above",
    defaultThreshold: 0,
  },
  {
    id: "RSI",
    label: "RSI",
    description: "Relative Strength Index",
    color: "bg-purple-500/20 border-purple-500/30 text-purple-300",
    defaultParams: { period: 14 },
    defaultOperator: "less_than",
    defaultThreshold: 30,
  },
  {
    id: "MACD",
    label: "MACD",
    description: "Convergence/Divergence",
    color: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    defaultOperator: "crosses_above",
    defaultThreshold: "signal",
  },
  {
    id: "BB",
    label: "BB",
    description: "Bollinger Bands",
    color: "bg-pink-500/20 border-pink-500/30 text-pink-300",
    defaultParams: { period: 20, stdDev: 2 },
    defaultOperator: "crosses_above",
    defaultThreshold: "lower",
  },
  {
    id: "ATR",
    label: "ATR",
    description: "Average True Range",
    color: "bg-orange-500/20 border-orange-500/30 text-orange-300",
    defaultParams: { period: 14 },
    defaultOperator: "greater_than",
    defaultThreshold: 1,
  },
  {
    id: "Stochastic",
    label: "Stoch",
    description: "Stochastic Oscillator",
    color: "bg-green-500/20 border-green-500/30 text-green-300",
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    defaultOperator: "less_than",
    defaultThreshold: 20,
  },
  {
    id: "VWAP",
    label: "VWAP",
    description: "Vol-Weighted Avg Price",
    color: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
    defaultParams: {},
    defaultOperator: "crosses_above",
    defaultThreshold: 0,
  },
];

export function getIndicatorMeta(id: IndicatorType): IndicatorMeta {
  return INDICATORS.find((i) => i.id === id) ?? INDICATORS[0];
}

function DraggableIndicator({ meta }: { meta: IndicatorMeta }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${meta.id}`,
    data: { fromPalette: true, indicator: meta },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        border rounded-xl p-3 cursor-grab active:cursor-grabbing select-none
        hover:scale-105 transition-transform
        ${meta.color}
      `}
    >
      <div className="font-mono font-bold text-sm">{meta.label}</div>
      <div className="text-xs opacity-70 mt-0.5 leading-tight">{meta.description}</div>
    </div>
  );
}

export function IndicatorPalette() {
  return (
    <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Indicators
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        Drag to BUY or SELL zone
      </p>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {INDICATORS.map((meta) => (
          <DraggableIndicator key={meta.id} meta={meta} />
        ))}
      </div>
    </div>
  );
}

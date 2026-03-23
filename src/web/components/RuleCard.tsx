import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import type { Rule } from "../../lib/types";
import { getIndicatorMeta } from "./IndicatorPalette";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface RuleCardProps {
  rule: Rule;
  onUpdate: (updated: Rule) => void;
  onDelete: () => void;
}

const OPERATORS = [
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "crosses_above", label: "↗ Crosses Above" },
  { value: "crosses_below", label: "↘ Crosses Below" },
];

const SPECIAL_THRESHOLDS: Record<string, string[]> = {
  MACD: ["signal"],
  BB: ["upper", "lower"],
};

export function RuleCard({ rule, onUpdate, onDelete }: RuleCardProps) {
  const meta = getIndicatorMeta(rule.indicator);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const updateParam = (key: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onUpdate({ ...rule, params: { ...rule.params, [key]: num } });
    }
  };

  const specialThresholds = SPECIAL_THRESHOLDS[rule.indicator] ?? [];
  const isSpecialThreshold = specialThresholds.includes(rule.threshold as string);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/[0.04] border border-white/10 rounded-xl p-3 flex flex-col gap-2 ${meta.color}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...listeners}
            {...attributes}
            className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold text-sm">{meta.label}</span>
          <span className="text-xs opacity-60">{meta.description}</span>
        </div>
        <button
          onClick={onDelete}
          className="text-slate-600 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Params */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(rule.params).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-xs text-slate-500">{key}=</span>
            <Input
              type="number"
              value={val}
              onChange={(e) => updateParam(key, e.target.value)}
              className="w-16 h-6 text-xs bg-black/30 border-white/10 text-white px-1.5 rounded-md"
            />
          </div>
        ))}
      </div>

      {/* Operator + Threshold */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={rule.operator}
          onValueChange={(v) => onUpdate({ ...rule, operator: v as Rule["operator"] })}
        >
          <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 text-white w-36 rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-white/10 text-white text-xs">
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {specialThresholds.length > 0 ? (
          <Select
            value={isSpecialThreshold ? (rule.threshold as string) : "custom"}
            onValueChange={(v) => {
              if (v === "custom") {
                onUpdate({ ...rule, threshold: 0 });
              } else {
                onUpdate({ ...rule, threshold: v as Rule["threshold"] });
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 text-white w-24 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111827] border-white/10 text-white text-xs">
              {specialThresholds.map((t) => (
                <SelectItem key={t} value={t} className="text-xs capitalize">
                  {t}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="text-xs">Custom #</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        {(!isSpecialThreshold || specialThresholds.length === 0) && (
          <Input
            type="number"
            value={typeof rule.threshold === "number" ? rule.threshold : 0}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) onUpdate({ ...rule, threshold: num });
            }}
            className="w-20 h-7 text-xs bg-black/30 border-white/10 text-white px-2 rounded-md"
            placeholder="value"
          />
        )}
      </div>
    </div>
  );
}

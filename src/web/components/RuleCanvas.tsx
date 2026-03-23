import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import type { Rule } from "../../lib/types";
import { RuleCard } from "./RuleCard";

interface DropZoneProps {
  id: "buy" | "sell";
  rules: Rule[];
  onUpdate: (ruleId: string, updated: Rule) => void;
  onDelete: (ruleId: string) => void;
}

function DropZone({ id, rules, onUpdate, onDelete }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isBuy = id === "buy";

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-h-[220px] rounded-2xl border-2 border-dashed transition-all duration-200 p-4 flex flex-col gap-3
        ${
          isOver
            ? isBuy
              ? "border-emerald-500/60 bg-emerald-500/5"
              : "border-red-500/60 bg-red-500/5"
            : "border-white/10 bg-white/[0.02]"
        }
      `}
    >
      {/* Zone header */}
      <div className="flex items-center gap-2">
        {isBuy ? (
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        <span
          className={`font-semibold text-sm tracking-wide ${
            isBuy ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isBuy ? "BUY Rules" : "SELL Rules"}
        </span>
        <span className="ml-auto text-xs text-slate-600">
          {rules.length === 0 ? "Drop indicators here" : `${rules.length} rule${rules.length > 1 ? "s" : ""} (AND)`}
        </span>
      </div>

      {/* Empty state */}
      {rules.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-700">
          <Plus className="w-8 h-8" />
          <p className="text-xs text-center leading-relaxed">
            Drag indicators from the panel
            <br />
            to create {isBuy ? "buy" : "sell"} conditions
          </p>
        </div>
      )}

      {/* Rule cards */}
      <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onUpdate={(updated) => onUpdate(rule.id, updated)}
            onDelete={() => onDelete(rule.id)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

interface RuleCanvasProps {
  buyRules: Rule[];
  sellRules: Rule[];
  onUpdateBuy: (ruleId: string, updated: Rule) => void;
  onUpdateSell: (ruleId: string, updated: Rule) => void;
  onDeleteBuy: (ruleId: string) => void;
  onDeleteSell: (ruleId: string) => void;
}

export function RuleCanvas({
  buyRules,
  sellRules,
  onUpdateBuy,
  onUpdateSell,
  onDeleteBuy,
  onDeleteSell,
}: RuleCanvasProps) {
  return (
    <div className="flex flex-col gap-4">
      <DropZone id="buy" rules={buyRules} onUpdate={onUpdateBuy} onDelete={onDeleteBuy} />
      <DropZone id="sell" rules={sellRules} onUpdate={onUpdateSell} onDelete={onDeleteSell} />
    </div>
  );
}

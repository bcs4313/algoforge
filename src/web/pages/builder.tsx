import { useState, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  TrendingUp,
  Save,
  Play,
  Loader2,
  Settings2,
  LogOut,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession, signOut } from "../lib/auth";
import { IndicatorPalette, INDICATORS, getIndicatorMeta } from "../components/IndicatorPalette";
import { RuleCanvas } from "../components/RuleCanvas";
import { AIChatPanel } from "../components/AIChatPanel";
import { BacktestResults } from "../components/BacktestResults";
import { fetchBacktest, saveStrategy } from "../lib/api";
import { nanoid } from "../lib/nanoid";
import type { Rule, StrategyRules, BacktestResult } from "../../lib/types";
import { Toaster, toast } from "sonner";

const DEFAULT_TICKER = "AAPL";
const DEFAULT_FROM = "2022-01-01";
const DEFAULT_TO = "2024-01-01";

export default function Builder() {
  const { data: session } = useSession();
  const [, navigate] = useLocation();

  const [strategyId, setStrategyId] = useState<string | undefined>();
  const [strategyName, setStrategyName] = useState("My Strategy");
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_TO);

  const [buyRules, setBuyRules] = useState<Rule[]>([]);
  const [sellRules, setSellRules] = useState<Rule[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestError, setBacktestError] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Load strategy from strategies page
  useEffect(() => {
    const stored = sessionStorage.getItem("loadStrategy");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setStrategyId(s.id);
        setStrategyName(s.name ?? "Untitled");
        setTicker(s.ticker ?? "AAPL");
        setDateFrom(s.dateFrom ?? DEFAULT_FROM);
        setDateTo(s.dateTo ?? DEFAULT_TO);
        const rules = s.rules as { buy: Rule[]; sell: Rule[] };
        setBuyRules(rules?.buy ?? []);
        setSellRules(rules?.sell ?? []);
        sessionStorage.removeItem("loadStrategy");
      } catch {
        // ignore
      }
    }
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const fromPalette = active.data.current?.fromPalette;

      if (fromPalette) {
        // Drop from palette → create new rule
        const indicatorMeta = active.data.current?.indicator;
        if (!indicatorMeta) return;

        const newRule: Rule = {
          id: nanoid(),
          indicator: indicatorMeta.id,
          params: { ...indicatorMeta.defaultParams },
          operator: indicatorMeta.defaultOperator as Rule["operator"],
          threshold: indicatorMeta.defaultThreshold as Rule["threshold"],
        };

        if (overId === "buy" || buyRules.some((r) => r.id === overId)) {
          setBuyRules((prev) => [...prev, newRule]);
        } else if (overId === "sell" || sellRules.some((r) => r.id === overId)) {
          setSellRules((prev) => [...prev, newRule]);
        }
        return;
      }

      // Reorder within buy zone
      const buyIds = buyRules.map((r) => r.id);
      const sellIds = sellRules.map((r) => r.id);

      if (buyIds.includes(activeId) && buyIds.includes(overId)) {
        setBuyRules((prev) => {
          const oldIdx = prev.findIndex((r) => r.id === activeId);
          const newIdx = prev.findIndex((r) => r.id === overId);
          return arrayMove(prev, oldIdx, newIdx);
        });
      } else if (sellIds.includes(activeId) && sellIds.includes(overId)) {
        setSellRules((prev) => {
          const oldIdx = prev.findIndex((r) => r.id === activeId);
          const newIdx = prev.findIndex((r) => r.id === overId);
          return arrayMove(prev, oldIdx, newIdx);
        });
      }
    },
    [buyRules, sellRules]
  );

  const handleRunBacktest = async () => {
    if (buyRules.length === 0 && sellRules.length === 0) {
      setBacktestError("Add at least one BUY or SELL rule before running a backtest.");
      return;
    }
    setBacktestLoading(true);
    setBacktestError("");
    setBacktestResult(null);
    try {
      const result = await fetchBacktest({
        ticker: ticker.toUpperCase(),
        dateFrom,
        dateTo,
        rules: { buy: buyRules, sell: sellRules },
        initialCapital: 10000,
        iterations: 500,
      });
      setBacktestResult(result);
    } catch (err) {
      setBacktestError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) {
      navigate("/sign-in");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveStrategy({
        id: strategyId,
        name: strategyName,
        ticker,
        dateFrom,
        dateTo,
        rules: { buy: buyRules, sell: sellRules },
      });
      setStrategyId(saved.id);
      toast.success("Strategy saved!");
    } catch {
      toast.error("Failed to save strategy");
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = (side: "buy" | "sell", rule: Rule) => {
    if (side === "buy") {
      setBuyRules((prev) => [...prev, rule]);
    } else {
      setSellRules((prev) => [...prev, rule]);
    }
    toast.success(`Added ${rule.indicator} rule to ${side.toUpperCase()} zone`);
  };

  const activeFromPalette = activeId?.startsWith("palette-");
  const activePaletteId = activeFromPalette ? activeId?.replace("palette-", "") : null;
  const activePaletteMeta = activePaletteId
    ? INDICATORS.find((i) => i.id === activePaletteId)
    : null;
  const activeDragRule =
    !activeFromPalette && activeId
      ? [...buyRules, ...sellRules].find((r) => r.id === activeId)
      : null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans flex flex-col">
      <Toaster theme="dark" position="top-right" />

      {/* Top bar */}
      <header className="border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          <span className="font-semibold text-sm">AlgoForge</span>
        </div>

        {/* Strategy name */}
        <div className="flex items-center gap-2 ml-2">
          <Settings2 className="w-4 h-4 text-slate-600" />
          <Input
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="h-7 w-40 text-sm bg-white/5 border-white/10 text-white rounded-lg px-2"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {session ? (
            <>
              <Link href="/strategies">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 text-xs">
                  My Strategies
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut().then(() => navigate("/"))}
                className="text-slate-500 hover:text-white h-8 px-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link href="/sign-in">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold h-8 text-xs">
                Sign In to Save
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Config bar */}
      <div className="border-b border-white/5 px-4 py-2.5 flex flex-wrap items-center gap-3 bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Ticker</span>
          <Input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="h-7 w-20 text-sm bg-white/5 border-white/10 text-white rounded-lg px-2 font-mono uppercase"
            maxLength={6}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">From</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 w-36 text-xs bg-white/5 border-white/10 text-white rounded-lg px-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">To</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 w-36 text-xs bg-white/5 border-white/10 text-white rounded-lg px-2"
          />
        </div>
        <Button
          onClick={handleRunBacktest}
          disabled={backtestLoading}
          className="ml-auto bg-teal-500 hover:bg-teal-400 text-black font-bold h-8 px-5 text-sm rounded-xl"
        >
          {backtestLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 fill-black" /> Run Backtest
            </span>
          )}
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left: Palette */}
          <aside className="w-48 border-r border-white/5 p-3 overflow-y-auto flex-shrink-0">
            <IndicatorPalette />
          </aside>

          {/* Center: Canvas + Results */}
          <main className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
            <RuleCanvas
              buyRules={buyRules}
              sellRules={sellRules}
              onUpdateBuy={(id, rule) =>
                setBuyRules((prev) => prev.map((r) => (r.id === id ? rule : r)))
              }
              onUpdateSell={(id, rule) =>
                setSellRules((prev) => prev.map((r) => (r.id === id ? rule : r)))
              }
              onDeleteBuy={(id) => setBuyRules((prev) => prev.filter((r) => r.id !== id))}
              onDeleteSell={(id) => setSellRules((prev) => prev.filter((r) => r.id !== id))}
            />

            {/* Backtest error */}
            {backtestError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {backtestError}
              </div>
            )}

            {/* Backtest loading skeleton */}
            {backtestLoading && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-white/[0.03] border border-white/8 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
                <div className="h-56 bg-white/[0.02] border border-white/8 rounded-2xl animate-pulse" />
              </div>
            )}

            {/* Results */}
            {backtestResult && !backtestLoading && (
              <BacktestResults result={backtestResult} initialCapital={10000} />
            )}
          </main>

          {/* Drag overlay */}
          <DragOverlay>
            {activePaletteMeta && (
              <div
                className={`border rounded-xl p-3 shadow-2xl cursor-grabbing w-36 ${activePaletteMeta.color}`}
              >
                <div className="font-mono font-bold text-sm">{activePaletteMeta.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{activePaletteMeta.description}</div>
              </div>
            )}
            {activeDragRule && (
              <div
                className={`border rounded-xl p-3 shadow-2xl cursor-grabbing w-56 ${getIndicatorMeta(activeDragRule.indicator).color}`}
              >
                <span className="font-mono font-bold text-sm">
                  {activeDragRule.indicator}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Right: AI Chat */}
        <aside className="w-72 border-l border-white/5 p-3 overflow-y-auto flex-shrink-0 flex flex-col">
          <AIChatPanel
            strategyRules={{ buy: buyRules, sell: sellRules }}
            ticker={ticker}
            onApplySuggestion={handleApplySuggestion}
          />
        </aside>
      </div>
    </div>
  );
}

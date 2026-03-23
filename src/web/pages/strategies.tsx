import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  TrendingUp,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  LogOut,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "../lib/auth";
import { fetchStrategies, deleteStrategy } from "../lib/api";
import type { Strategy } from "../../api/database/schema";
import { Toaster, toast } from "sonner";

export default function Strategies() {
  const { data: session, isPending } = useSession();
  const [, navigate] = useLocation();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) navigate("/sign-in");
  }, [session, isPending]);

  useEffect(() => {
    if (!session) return;
    fetchStrategies()
      .then(setStrategies)
      .catch(() => toast.error("Failed to load strategies"))
      .finally(() => setLoading(false));
  }, [session]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteStrategy(id);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast.success("Strategy deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (strategy: Strategy) => {
    // Store in sessionStorage for builder to pick up
    sessionStorage.setItem("loadStrategy", JSON.stringify(strategy));
    navigate("/builder");
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
      <Toaster theme="dark" />

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center gap-4 max-w-5xl mx-auto">
        <Link href="/builder">
          <button className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Builder
          </button>
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          <span className="font-semibold">AlgoForge</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-400">{session?.user.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut().then(() => navigate("/"))}
            className="text-slate-500 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Strategies</h1>
            <p className="text-slate-400 text-sm mt-1">
              {strategies.length} saved{" "}
              {strategies.length === 1 ? "strategy" : "strategies"}
            </p>
          </div>
          <Link href="/builder">
            <Button className="bg-teal-500 hover:bg-teal-400 text-black font-bold h-9 px-5 text-sm rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> New Strategy
            </Button>
          </Link>
        </div>

        {strategies.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">No strategies yet</h3>
            <p className="text-slate-600 text-sm mb-6">
              Build your first strategy and save it here.
            </p>
            <Link href="/builder">
              <Button className="bg-teal-500 hover:bg-teal-400 text-black font-bold">
                Open Builder
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {strategies.map((strategy) => {
              const rules = strategy.rules as { buy: unknown[]; sell: unknown[] };
              const buyCount = rules?.buy?.length ?? 0;
              const sellCount = rules?.sell?.length ?? 0;

              return (
                <div
                  key={strategy.id}
                  className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex items-center gap-4 hover:border-teal-500/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white truncate">{strategy.name}</span>
                      <span className="font-mono text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.5">
                        {strategy.ticker}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {strategy.dateFrom} → {strategy.dateTo}
                      </span>
                      <span className="text-emerald-500">{buyCount} buy rules</span>
                      <span className="text-red-500">{sellCount} sell rules</span>
                      {strategy.updatedAt && (
                        <span>
                          Updated {new Date(strategy.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoad(strategy)}
                      className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(strategy.id)}
                      disabled={deletingId === strategy.id}
                      className="text-slate-600 hover:text-red-400 h-8 px-2"
                    >
                      {deletingId === strategy.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

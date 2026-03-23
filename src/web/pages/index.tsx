import { Link } from "wouter";
import { useSession } from "../lib/auth";
import {
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Shuffle,
  ArrowRight,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: <Shuffle className="w-6 h-6 text-teal-400" />,
    title: "Drag & Drop Strategy Builder",
    desc: "Visually compose buy/sell rules by dragging technical indicators onto the canvas. No code required.",
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-teal-400" />,
    title: "AI Strategy Advisor",
    desc: "Describe your trading intent in plain English. The AI reads your current rules and suggests optimized indicator combinations.",
  },
  {
    icon: <Activity className="w-6 h-6 text-teal-400" />,
    title: "Real Historical Data",
    desc: "Backtest against actual OHLCV price data from Yahoo Finance across any date range you choose.",
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-teal-400" />,
    title: "Monte Carlo Simulation",
    desc: "Run 1,000 trade sequence resamplings to understand the true range of your strategy's performance.",
  },
];

const stats = [
  { value: "8+", label: "Technical Indicators" },
  { value: "1,000", label: "MC Simulations" },
  { value: "5", label: "Risk Metrics" },
  { value: "Free", label: "To Start" },
];

export default function Landing() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-teal-400" />
          <span className="text-lg font-semibold tracking-tight">AlgoForge</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/strategies">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  My Strategies
                </Button>
              </Link>
              <Link href="/builder">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                  Builder
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-black font-semibold">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-sm text-teal-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Portfolio Project — Algorithmic Trading Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Build & Backtest
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
            Trading Algorithms
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Drag and drop technical indicators to construct buy/sell rules. Consult AI to
          refine your logic. Backtest with real data and validate via Monte Carlo simulation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={session ? "/builder" : "/sign-up"}>
            <Button
              size="lg"
              className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-8 py-6 text-base rounded-xl"
            >
              Start Building <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          {!session && (
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 text-slate-300 hover:bg-white/5 px-8 py-6 text-base rounded-xl"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-teal-400">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to test a strategy
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            From rule construction to statistical validation — all in one tool.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-teal-500/30 transition-colors"
            >
              <div className="mb-4 w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Indicators grid */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-8">
          <h3 className="text-xl font-semibold mb-6 text-center">
            Supported Technical Indicators
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "SMA", desc: "Simple Moving Average" },
              { name: "EMA", desc: "Exponential Moving Average" },
              { name: "RSI", desc: "Relative Strength Index" },
              { name: "MACD", desc: "Convergence/Divergence" },
              { name: "BB", desc: "Bollinger Bands" },
              { name: "ATR", desc: "Average True Range" },
              { name: "Stochastic", desc: "Stochastic Oscillator" },
              { name: "VWAP", desc: "Vol-Weighted Avg Price" },
            ].map((ind) => (
              <div
                key={ind.name}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-center"
              >
                <div className="font-mono font-bold text-teal-400 text-sm">{ind.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{ind.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to forge your algorithm?</h2>
          <p className="text-slate-400 mb-8">
            Create a free account and start building in minutes.
          </p>
          <Link href={session ? "/builder" : "/sign-up"}>
            <Button
              size="lg"
              className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-10 py-6 text-base rounded-xl"
            >
              {session ? "Open Builder" : "Create Free Account"}{" "}
              <ChevronRight className="ml-1 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          <span className="text-slate-400 font-medium">AlgoForge</span>
        </div>
        <p>Portfolio project — for demonstration purposes only. Not financial advice.</p>
      </footer>
    </div>
  );
}

# AlgoForge

> AI-driven algorithmic trading strategy builder with drag-and-drop technical indicator rules, Monte Carlo backtesting, and buy & hold comparison.

![AlgoForge Landing](https://i.imgur.com/zfdSQfY.png)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Using the Builder](#using-the-builder)
- [Interpreting Results](#interpreting-results)
- [Project Structure](#project-structure)
- [Deploying to Vercel](#deploying-to-vercel)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Hono (Node.js) |
| Database | Neon Serverless PostgreSQL + Drizzle ORM |
| Auth | Better Auth (email/password) |
| AI | AI SDK + OpenAI/Anthropic |
| Stock Data | yahoo-finance2 (free, no API key) |
| Indicators | technicalindicators |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free tier)
- An OpenAI or Anthropic API key (for the AI advisor)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/algoforge.git
cd algoforge
npm install --legacy-peer-deps
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Neon PostgreSQL — use the pooled connection string
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/algoforge?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your-random-32-char-secret
BETTER_AUTH_URL=http://localhost:9925

# AI — OpenAI or Anthropic
AI_GATEWAY_BASE_URL=https://api.openai.com/v1
AI_GATEWAY_API_KEY=sk-proj-...

# Server port
API_PORT=3001
```

> **Get `DATABASE_URL`:** Neon dashboard → your project → Connection Details → select **Pooled** connection string.

> **Generate `BETTER_AUTH_SECRET`:** Run `openssl rand -hex 32` in your terminal.

### 3. Push Database Schema

```bash
npx drizzle-kit push
```

This creates all tables in your Neon database: `user`, `session`, `account`, `verification`, `strategies`, `price_cache`.

### 4. Run

Open two terminals:

```bash
# Terminal 1 — API backend (port 3001)
npm run server

# Terminal 2 — Frontend (port 9925)
npx vite --port 9925
```

Open [http://localhost:9925](http://localhost:9925).

---

## Using the Builder

### Create an Account

![Sign Up](https://i.imgur.com/zBdfhxk.png)

Sign up with any email and password (min 8 characters). Strategies are saved per account.

---

### The Builder Interface

![Builder](https://i.imgur.com/iyI9WgQ.png)

The builder has three panels:

| Panel | Description |
|---|---|
| **Left** | Indicator palette — 8 draggable tiles |
| **Center** | Rule canvas — BUY and SELL drop zones + backtest results |
| **Right** | AI Strategy Advisor chat |

---

### Step 1 — Configure the Ticker & Date Range

At the top of the builder, set:

- **Ticker** — any valid stock symbol (e.g. `AAPL`, `TSLA`, `SPY`, `MSFT`)
- **From / To** — the historical date range to backtest over

Price data is fetched from Yahoo Finance and cached automatically on first run.

---

### Step 2 — Build Your Rules

Drag indicator tiles from the left panel into either the **BUY Rules** or **SELL Rules** zone.

```
BUY zone  — conditions that must ALL be true to trigger a buy signal
SELL zone — conditions that must ALL be true to trigger a sell signal
```

Multiple rules in a zone are AND-combined. A signal fires only when every rule in that zone is satisfied on the same bar.

**Supported Indicators:**

| Indicator | Key Params | Typical Use |
|---|---|---|
| `SMA` | `period` | Trend direction — price above SMA = bullish |
| `EMA` | `period` | Faster trend — reacts quicker than SMA |
| `RSI` | `period` | Momentum — < 30 oversold, > 70 overbought |
| `MACD` | `fast`, `slow`, `signal` | Crossover momentum signals |
| `BB` | `period`, `stdDev` | Volatility bands — touch lower = potential reversal |
| `ATR` | `period` | Volatility filter — gate trades on market conditions |
| `Stochastic` | `kPeriod`, `dPeriod` | Reversal — K < 20 oversold, K > 80 overbought |
| `VWAP` | — | Volume-weighted fair value reference |

**All periods are in trading days** (1 bar = 1 trading day).

---

### Step 3 — Configure Each Rule Card

Once dropped, each indicator becomes an editable rule card:

```
[ RSI ]  period = 14   [less_than ▾]   [ 30 ]
```

- **Params** — click any number field to edit (e.g. change period from 14 to 21)
- **Operator** — dropdown with 4 options:
  - `>` greater than
  - `<` less than
  - `↗ Crosses Above` — value crossed above threshold on this bar
  - `↘ Crosses Below` — value crossed below threshold on this bar
- **Threshold** — a numeric value, or `signal` (MACD), `upper`/`lower` (Bollinger Bands)

Rules can be reordered by dragging the grip handle on the left of each card.

---

### Example Strategy — RSI Mean Reversion

| Zone | Indicator | Params | Operator | Threshold |
|---|---|---|---|---|
| BUY | RSI | period=1 | less_than | 30 |
| SELL | RSI | period=1 | greater_than | 70 |

**Logic:** 

buy when RSI dips below 30 (oversold), sell when RSI rises above 70 (overbought).
Targeting symbol IBIT (bitcoin ETF)

<img src="https://i.imgur.com/KzuIMZm.png" width="100%"></img>


---

### Step 4 — Run the Backtest

Click **Run Backtest** in the top right. The backend will:

1. Fetch OHLCV price data (or use cached data)
2. Compute all indicator values across every bar
3. Walk each bar and evaluate your rules — generate a trade list
4. Run **500 Monte Carlo simulations** by resampling the trade P&L sequence
5. Return results to the frontend

For example, here are the results for our IBIT monte carlo simulation:

<img src="https://i.imgur.com/9pou9ZL.png"></img>

We can see that our drawdown and probability of ruin is volatile (which is common for btc strategies).
However, we significantly outperform a buy and hold strategy and have a healthy sharpe ratio of 1.42.

---

### Step 5 — Save Your Strategy

Click **Save** in the top bar (requires sign-in). Saved strategies appear in **My Strategies** and can be loaded back into the builder at any time.
<img src="https://i.imgur.com/g8VqAgv.png"></img>

<img src="https://i.imgur.com/cIzGpAB.png"></img>

---

### AI Strategy Advisor

The right panel contains an AI chat that reads your current strategy and can suggest indicator rules.

```
You:   "I want to buy on strong upward momentum"
AI:    Suggests adding EMA crosses_above with explanation
       [ Apply to Strategy ]  ← click to add the rule to the canvas
```

The AI never modifies your strategy without your explicit confirmation. Every suggestion requires clicking **Apply to Strategy**.

---

## Interpreting Results

### Buy & Hold Comparison Banner

```
▲ Outperforms   Strategy median +18.4%   Buy & Hold +12.1%   Alpha +6.3%
```

- **Strategy median** — the 50th percentile outcome across 500 MC simulations
- **Buy & Hold** — what a simple buy-on-day-1 / sell-on-last-day would have returned
- **Alpha** — the difference. Positive = your strategy beat holding the stock

---

### Equity Curve Fan Chart

The chart shows three lines for your strategy plus a buy & hold reference:

| Line | Color | Meaning |
|---|---|---|
| P90 | Teal (faint) | Best-case 10% of simulations |
| Median (P50) | Teal (solid) | Most likely outcome |
| P10 | Teal (faint) | Worst-case 10% of simulations |
| Buy & Hold | Orange dashed | Simple hold baseline |

The dashed white horizontal line is your starting capital ($10,000). The spread between P10 and P90 represents the **uncertainty range** of your strategy — a wider fan means more variance in outcomes.

---

### Stat Cards

| Metric | What it means | Good value |
|---|---|---|
| **Sharpe Ratio** | Risk-adjusted return (annualized). `(mean return / std dev) × √252` | > 1.0 |
| **Max Drawdown** | Largest peak-to-trough equity drop in the actual backtest | < 20% |
| **Win Rate** | % of closed trades that were profitable | > 50% |
| **Prob. of Ruin** | % of MC simulations where equity fell below 50% of starting capital | < 10% |
| **Median Return** | Median final return across all 500 MC simulations | > Buy & Hold |

---

### Return Distribution Histogram

A histogram of the 500 final equity values across MC simulations. The dashed vertical line marks starting capital ($10,000).

- **Right-skewed** distribution = more upside scenarios than downside
- **Tight clustering** = consistent outcomes, low variance
- **Wide spread** = highly path-dependent strategy

---

### Trade Log

Each row is a single executed trade with:

| Column | BUY row | SELL row |
|---|---|---|
| Cost / Realized P&L | Capital deployed (e.g. `−$9,823`) | Realized gain/loss (e.g. `+$1,204`) |
| Portfolio | Total portfolio value after trade executes |

> Note: P&L is only **realized** on SELL. BUY rows show how much capital was deployed into the position.

---

### Limitations to be aware of

- **No slippage or commission** — real execution costs are not modeled
- **No partial fills** — trades execute fully at the closing price of the signal bar
- **Daily bars only** — intraday signals are not supported
- **Look-ahead bias** — indicators use only data available up to that bar, but always verify your rule logic

---

## Project Structure

```
algoforge/
├── api/
│   └── index.ts              ← Vercel serverless entry point
├── src/
│   ├── api/
│   │   ├── database/
│   │   │   ├── schema.ts     ← Drizzle schema (users, strategies, price_cache)
│   │   │   └── db.ts         ← Neon HTTP connection
│   │   ├── engine/
│   │   │   ├── indicators.ts ← SMA, EMA, RSI, MACD, BB, ATR, Stochastic, VWAP
│   │   │   ├── signals.ts    ← Rule evaluator (bar-by-bar)
│   │   │   └── backtest.ts   ← Monte Carlo simulation engine
│   │   ├── routes/
│   │   │   ├── backtest.ts   ← POST /api/backtest
│   │   │   ├── strategies.ts ← CRUD /api/strategies
│   │   │   ├── stocks.ts     ← GET /api/stocks/history
│   │   │   └── agent.ts      ← POST /api/agent/messages
│   │   ├── auth.ts           ← Better Auth config
│   │   └── server.ts         ← Node.js dev server
│   ├── web/
│   │   ├── pages/
│   │   │   ├── index.tsx     ← Landing page
│   │   │   ├── builder.tsx   ← Strategy builder (main page)
│   │   │   ├── strategies.tsx← Saved strategies list
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   └── components/
│   │       ├── IndicatorPalette.tsx
│   │       ├── RuleCanvas.tsx
│   │       ├── RuleCard.tsx
│   │       ├── AIChatPanel.tsx
│   │       └── BacktestResults.tsx
│   └── lib/
│       └── types.ts          ← Shared TypeScript types
├── drizzle.config.ts
├── vite.config.ts
└── vercel.json
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/algoforge.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Leave build settings as default (Vercel auto-detects Vite)

### 3. Set Environment Variables

In Vercel dashboard → Project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | Your 32-char secret |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `AI_GATEWAY_BASE_URL` | `https://api.openai.com/v1` |
| `AI_GATEWAY_API_KEY` | Your API key |

### 4. Deploy

Push any commit to `main` — Vercel deploys automatically.

The `vercel.json` in the project root handles routing:
- `/api/*` → Hono serverless function
- `/*` → React SPA (`index.html`)

---

## License

MIT

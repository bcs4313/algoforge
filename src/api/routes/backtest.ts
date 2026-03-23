import { Hono } from "hono";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { db } from "../database/db";
import { priceCache } from "../database/schema";
import { eq } from "drizzle-orm";
import { runBacktest } from "../engine/backtest";
import type { OHLCVBar, BacktestRequest } from "../../lib/types";

export const backtestRoutes = new Hono();

backtestRoutes.post("/", async (c) => {
  const body = (await c.req.json()) as BacktestRequest;
  const { ticker, dateFrom, dateTo, rules, initialCapital = 10000, iterations = 1000 } = body;

  const cacheId = `${ticker.toUpperCase()}:${dateFrom}:${dateTo}`;

  try {
    let bars: OHLCVBar[];

    // Check cache
    const cached = await db
      .select()
      .from(priceCache)
      .where(eq(priceCache.id, cacheId))
      .limit(1);

    if (cached.length > 0) {
      bars = cached[0].data as OHLCVBar[];
    } else {
      const result = await yahooFinance.historical(ticker.toUpperCase(), {
        period1: dateFrom,
        period2: dateTo,
        interval: "1d",
      });

      bars = result
        .filter((r) => r.open && r.high && r.low && r.close && r.volume)
        .map((r) => ({
          date: r.date.toISOString().split("T")[0],
          open: r.open!,
          high: r.high!,
          low: r.low!,
          close: r.close!,
          volume: r.volume!,
        }));

      await db
        .insert(priceCache)
        .values({ id: cacheId, ticker: ticker.toUpperCase(), data: bars })
        .onConflictDoUpdate({ target: priceCache.id, set: { data: bars } });
    }

    if (bars.length < 30) {
      return c.json({ error: "Not enough price data for the selected range" }, 400);
    }

    const result = runBacktest(bars, rules, initialCapital, iterations);
    return c.json(result);
  } catch (err) {
    console.error("Backtest error:", err);
    return c.json({ error: "Backtest failed" }, 500);
  }
});

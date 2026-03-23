import { Hono } from "hono";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { db } from "../database/db";
import { priceCache } from "../database/schema";
import { eq } from "drizzle-orm";
import type { OHLCVBar } from "../../lib/types";

export const stockRoutes = new Hono();

stockRoutes.get("/history", async (c) => {
  const ticker = (c.req.query("ticker") ?? "AAPL").toUpperCase();
  const dateFrom = c.req.query("from") ?? "2022-01-01";
  const dateTo = c.req.query("to") ?? "2024-01-01";

  const cacheId = `${ticker}:${dateFrom}:${dateTo}`;

  try {
    // Check cache
    const cached = await db
      .select()
      .from(priceCache)
      .where(eq(priceCache.id, cacheId))
      .limit(1);

    if (cached.length > 0) {
      return c.json({ bars: cached[0].data as OHLCVBar[] });
    }

    // Fetch from Yahoo Finance
    const result = await yahooFinance.historical(ticker, {
      period1: dateFrom,
      period2: dateTo,
      interval: "1d",
    });

    const bars: OHLCVBar[] = result
      .filter((r) => r.open && r.high && r.low && r.close && r.volume)
      .map((r) => ({
        date: r.date.toISOString().split("T")[0],
        open: r.open!,
        high: r.high!,
        low: r.low!,
        close: r.close!,
        volume: r.volume!,
      }));

    // Cache it
    await db
      .insert(priceCache)
      .values({ id: cacheId, ticker, data: bars })
      .onConflictDoUpdate({ target: priceCache.id, set: { data: bars } });

    return c.json({ bars });
  } catch (err) {
    console.error("Stock fetch error:", err);
    return c.json({ error: "Failed to fetch stock data" }, 500);
  }
});

import { Hono } from "hono";
import { db } from "../database/db";
import { strategies } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, authenticatedOnly } from "../middleware/authentication";

export const strategyRoutes = new Hono();

strategyRoutes.use("*", authMiddleware);
strategyRoutes.use("*", authenticatedOnly);

// List all strategies for user
strategyRoutes.get("/", async (c) => {
  const user = c.get("user") as { id: string };
  const rows = await db
    .select()
    .from(strategies)
    .where(eq(strategies.userId, user.id))
    .orderBy(strategies.updatedAt);
  return c.json(rows);
});

// Get single strategy
strategyRoutes.get("/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");
  const rows = await db
    .select()
    .from(strategies)
    .where(and(eq(strategies.id, id), eq(strategies.userId, user.id)))
    .limit(1);
  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json(rows[0]);
});

// Create strategy
strategyRoutes.post("/", async (c) => {
  const user = c.get("user") as { id: string };
  const body = await c.req.json();
  const [row] = await db
    .insert(strategies)
    .values({
      userId: user.id,
      name: body.name ?? "Untitled Strategy",
      ticker: body.ticker ?? "AAPL",
      dateFrom: body.dateFrom ?? "2022-01-01",
      dateTo: body.dateTo ?? "2024-01-01",
      rules: body.rules ?? { buy: [], sell: [] },
    })
    .returning();
  return c.json(row, 201);
});

// Update strategy
strategyRoutes.put("/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");
  const body = await c.req.json();

  const [row] = await db
    .update(strategies)
    .set({
      name: body.name,
      ticker: body.ticker,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      rules: body.rules,
      updatedAt: new Date(),
    })
    .where(and(eq(strategies.id, id), eq(strategies.userId, user.id)))
    .returning();

  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// Delete strategy
strategyRoutes.delete("/:id", async (c) => {
  const user = c.get("user") as { id: string };
  const id = c.req.param("id");
  await db
    .delete(strategies)
    .where(and(eq(strategies.id, id), eq(strategies.userId, user.id)));
  return c.json({ success: true });
});

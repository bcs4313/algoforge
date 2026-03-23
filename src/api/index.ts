import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { stockRoutes } from "./routes/stocks";
import { backtestRoutes } from "./routes/backtest";
import { strategyRoutes } from "./routes/strategies";
import { agentRoutes } from "./routes/agent";

const app = new Hono().basePath("/api");

app.use(
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Auth handler — handles all /api/auth/* routes
app.on(["GET", "POST"], "/auth/**", (c) => auth.handler(c.req.raw));

// App routes
app.route("/stocks", stockRoutes);
app.route("/backtest", backtestRoutes);
app.route("/strategies", strategyRoutes);
app.route("/agent", agentRoutes);

app.get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }));

export default app;

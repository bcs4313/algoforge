import type { BacktestRequest, BacktestResult, StrategyRules } from "../../lib/types";

export async function fetchBacktest(req: BacktestRequest): Promise<BacktestResult> {
  const res = await fetch("/api/backtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchStrategies() {
  const res = await fetch("/api/strategies");
  if (!res.ok) throw new Error("Failed to fetch strategies");
  return res.json();
}

export async function saveStrategy(data: {
  id?: string;
  name: string;
  ticker: string;
  dateFrom: string;
  dateTo: string;
  rules: StrategyRules;
}) {
  const url = data.id ? `/api/strategies/${data.id}` : "/api/strategies";
  const method = data.id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save strategy");
  return res.json();
}

export async function deleteStrategy(id: string) {
  const res = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete strategy");
  return res.json();
}

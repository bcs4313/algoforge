import { Hono } from "hono";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tool } from "ai";
import { z } from "zod";

export const agentRoutes = new Hono();

agentRoutes.post("/messages", async (c) => {
  const { messages, strategyContext } = await c.req.json();

  const openai = createOpenAI({
    baseURL: process.env.AI_GATEWAY_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  });

  const systemPrompt = `You are AlgoForge AI, an expert algorithmic trading assistant. You help users build effective trading strategies using technical indicators.

Current Strategy Context:
${strategyContext ? JSON.stringify(strategyContext, null, 2) : "No strategy loaded yet."}

Available indicators: SMA, EMA, RSI, MACD, Bollinger Bands (BB), ATR, Stochastic, VWAP.

When suggesting rules, always respond with a structured JSON suggestion wrapped in a code block like:
\`\`\`suggestion
{
  "side": "buy" | "sell",
  "indicator": "RSI",
  "params": { "period": 14 },
  "operator": "less_than",
  "threshold": 30,
  "explanation": "Buy when RSI is oversold below 30"
}
\`\`\`

Keep explanations concise, actionable, and educational. Reference the current strategy when making suggestions.`;

  const result = await streamText({
    model: openai.chat("anthropic/claude-haiku-4.5"),
    system: systemPrompt,
    messages,
    tools: {
      explainIndicator: tool({
        description: "Explain how a technical indicator works and when to use it",
        parameters: z.object({
          indicator: z.enum(["SMA", "EMA", "RSI", "MACD", "BB", "ATR", "Stochastic", "VWAP"]),
        }),
        execute: async ({ indicator }) => {
          const explanations: Record<string, string> = {
            SMA: "Simple Moving Average — averages price over N periods. Used to identify trend direction. Price above SMA = bullish trend.",
            EMA: "Exponential Moving Average — like SMA but weights recent prices more. Reacts faster to price changes. Great for momentum strategies.",
            RSI: "Relative Strength Index — oscillates 0-100. Above 70 = overbought (sell signal), below 30 = oversold (buy signal). Best in ranging markets.",
            MACD: "Moving Average Convergence Divergence — shows momentum via fast/slow EMA difference. MACD crossing above signal line = bullish.",
            BB: "Bollinger Bands — price channel based on volatility. Price touching lower band = potential buy. Price touching upper band = potential sell.",
            ATR: "Average True Range — measures volatility. High ATR = volatile market. Use as a filter: only trade when ATR is within a certain range.",
            Stochastic: "Stochastic Oscillator — compares closing price to price range over N periods. K < 20 = oversold, K > 80 = overbought.",
            VWAP: "Volume Weighted Average Price — fair value based on volume. Price above VWAP = bullish. Popular for intraday strategies.",
          };
          return explanations[indicator] ?? "Indicator not found.";
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
});

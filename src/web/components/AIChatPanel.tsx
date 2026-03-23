import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BrainCircuit, Send, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Rule, StrategyRules } from "../../lib/types";
import { nanoid } from "../lib/nanoid";
import { getIndicatorMeta } from "./IndicatorPalette";

interface SuggestionBlock {
  side: "buy" | "sell";
  indicator: Rule["indicator"];
  params: Record<string, number>;
  operator: Rule["operator"];
  threshold: Rule["threshold"];
  explanation: string;
}

function parseSuggestion(text: string): SuggestionBlock | null {
  const match = text.match(/```suggestion\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function stripSuggestionBlock(text: string): string {
  return text.replace(/```suggestion\n[\s\S]*?\n```/g, "").trim();
}

interface AIChatPanelProps {
  strategyRules: StrategyRules;
  ticker: string;
  onApplySuggestion: (side: "buy" | "sell", rule: Rule) => void;
}

export function AIChatPanel({ strategyRules, ticker, onApplySuggestion }: AIChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chat = useRef(
    new Chat({
      transport: new DefaultChatTransport({
        api: "/api/agent/messages",
        body: {},
      }),
    })
  );

  const { messages, sendMessage, status } = useChat({ chat: chat.current });
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({
      text: inputValue,
      data: {
        strategyContext: {
          ticker,
          buyRules: strategyRules.buy,
          sellRules: strategyRules.sell,
        },
      },
    });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const applyMessage = (sug: SuggestionBlock) => {
    const meta = getIndicatorMeta(sug.indicator);
    const rule: Rule = {
      id: nanoid(),
      indicator: sug.indicator,
      params: sug.params ?? meta.defaultParams,
      operator: sug.operator ?? (meta.defaultOperator as Rule["operator"]),
      threshold: sug.threshold ?? meta.defaultThreshold,
    };
    onApplySuggestion(sug.side, rule);
  };

  return (
    <div className="bg-white/[0.02] border border-white/8 rounded-2xl flex flex-col overflow-hidden h-full">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-teal-400" />
          <span className="font-semibold text-sm text-white">AI Strategy Advisor</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 min-h-0 max-h-[420px]">
            {messages.length === 0 && (
              <div className="text-slate-600 text-xs text-center py-6 leading-relaxed">
                Describe your trading intent and I'll suggest indicator rules.
                <br />
                <span className="text-slate-700">e.g. "Buy on strong momentum, sell when overbought"</span>
              </div>
            )}
            {messages.map((msg) => {
              const textPart = msg.parts?.find((p) => p.type === "text");
              const content = textPart?.type === "text" ? textPart.text : "";
              const suggestion = msg.role === "assistant" ? parseSuggestion(content) : null;
              const displayText = suggestion ? stripSuggestionBlock(content) : content;

              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-teal-500/20 text-teal-100 border border-teal-500/20"
                        : "bg-white/5 text-slate-300 border border-white/8"
                    }`}
                  >
                    {displayText && <p className="whitespace-pre-wrap">{displayText}</p>}

                    {suggestion && (
                      <div className="mt-2 bg-black/30 border border-white/10 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-mono font-bold ${
                            getIndicatorMeta(suggestion.indicator).color.split(" ")[2]
                          }`}>
                            {suggestion.indicator}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className={`text-xs font-semibold ${
                            suggestion.side === "buy" ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {suggestion.side.toUpperCase()} rule
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{suggestion.explanation}</p>
                        <Button
                          size="sm"
                          onClick={() => applyMessage(suggestion)}
                          className="h-6 text-xs bg-teal-500/20 hover:bg-teal-500/40 text-teal-300 border border-teal-500/30 w-full"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Apply to Strategy
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2">
                  <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/8 flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI advisor…"
              className="flex-1 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-lg"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              size="sm"
              disabled={isLoading || !inputValue.trim()}
              className="h-8 w-8 p-0 bg-teal-500 hover:bg-teal-400 text-black rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

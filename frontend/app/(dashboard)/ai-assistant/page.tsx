"use client";

import * as React from "react";
import { Bot, Send, Sparkles, User, HelpCircle, Code2, Database } from "lucide-react";
import { useAiQuery, useSuggestedPrompts } from "@/lib/hooks/use-ai-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  intent?: string;
  data?: any;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your Ethara Assistant. You can ask me natural language queries about employees, seating arrangements, project loads, or auto-allocations.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = React.useState("");

  const { data: suggestions, isLoading: suggestionsLoading } = useSuggestedPrompts();
  const queryMutation = useAiQuery();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    try {
      const response = await queryMutation.mutateAsync({ question: text });

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "assistant",
        text: response.summary,
        intent: response.intent,
        data: response.data,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "assistant",
        text: err.message || "Apologies, I encountered an issue processing that query. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] space-y-4 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">AI Search Companion</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Query system registers in plain English using vector semantic embeddings
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Chat stream (Left Pane) */}
        <Card className="lg:col-span-3 flex flex-col h-full border-zinc-200/80 shadow-sm dark:border-zinc-800 overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%] md:max-w-[75%]",
                    isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                      isAssistant
                        ? "bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-indigo-400"
                        : "bg-zinc-900 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-100 dark:text-zinc-900"
                    )}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className="space-y-1.5">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border",
                        isAssistant
                          ? "bg-white border-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                          : "bg-indigo-600 border-indigo-700 text-white dark:bg-indigo-500 dark:border-indigo-600"
                      )}
                    >
                      <p>{msg.text}</p>

                      {/* Intent label */}
                      {isAssistant && msg.intent && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                          <Code2 className="h-3 w-3" />
                          <span>INTENT: {msg.intent}</span>
                        </div>
                      )}
                    </div>

                    {/* Render matching records inspection if present */}
                    {isAssistant && msg.data && (
                      <details className="text-xs group border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden">
                        <summary className="px-3.5 py-2 cursor-pointer list-none flex items-center gap-1.5 font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 outline-none">
                          <Database className="h-3.5 w-3.5" />
                          <span>Inspect matched records ({Array.isArray(msg.data) ? msg.data.length : 1})</span>
                        </summary>
                        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 max-h-[160px] overflow-y-auto font-mono text-[10px] bg-white dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 leading-tight">
                          <pre>{JSON.stringify(msg.data, null, 2)}</pre>
                        </div>
                      </details>
                    )}

                    <span className="text-[10px] text-zinc-400 block px-1 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}

            {queryMutation.isPending && (
              <div className="flex gap-3 max-w-[75%] mr-auto">
                <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 dark:bg-zinc-800 dark:border-zinc-700">
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input bar */}
          <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <Input
                placeholder="Ask about workspace state..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={queryMutation.isPending}
                className="h-11 bg-white border-zinc-200"
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim() || queryMutation.isPending} className="h-11 w-11">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Suggestion Chips (Right Pane) */}
        <Card className="lg:col-span-1 border-zinc-200/80 shadow-sm dark:border-zinc-800 overflow-hidden flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-base">Suggested Queries</CardTitle>
            </div>
            <CardDescription>Click a card below to send immediately</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2.5">
            {suggestionsLoading ? (
              <span className="text-xs text-zinc-500">Loading suggestions...</span>
            ) : (
              suggestions?.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={queryMutation.isPending}
                  className="w-full text-left p-3 rounded-xl border border-zinc-200/80 hover:border-indigo-200 hover:bg-indigo-50/20 text-xs font-medium text-zinc-700 hover:text-zinc-900 transition-all dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200"
                >
                  {prompt}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import type { Deal } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
  toolEvents?: Array<{ name: string; input: unknown; output: unknown }>;
}

interface Props {
  deal: Deal;
  onDealUpdate: (d: Deal) => void;
}

const SUGGESTIONS = [
  "What's the current Total Project Cost and project IRR?",
  "Raise the cap rate to 6.5% and tell me the impact.",
  "Run a scenario with construction cost at $410/SF.",
  "Explain how the takeout loan is sized.",
];

export default function Chat({ deal, onDealUpdate }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setError(null);
    const nextTurns: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(nextTurns);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal,
          history: turns.map((t) => ({ role: t.role, content: t.content })),
          prompt: trimmed,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error ?? "Request failed");
      }
      const data = await res.json();
      onDealUpdate(data.deal as Deal);
      setTurns([
        ...nextTurns,
        { role: "assistant", content: data.reply || "(no reply)", toolEvents: data.toolEvents },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-rule px-5 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">AI Analyst</h2>
        <p className="text-xs text-muted">Direct the proforma with plain English.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Try one of these to get started:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-rule bg-white px-3 py-2 text-left text-sm hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {turns.map((t, i) => (
            <div key={i}>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                {t.role === "user" ? "You" : "Analyst"}
              </div>
              <div
                className={
                  t.role === "user"
                    ? "rounded-md bg-white px-3 py-2 text-sm"
                    : "rounded-md border border-rule bg-white px-3 py-2 text-sm"
                }
              >
                {t.content.split("\n").map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-2" : undefined}>
                    {line}
                  </p>
                ))}
              </div>
              {t.toolEvents && t.toolEvents.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted">
                    {t.toolEvents.length} tool call{t.toolEvents.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="mt-1 space-y-1 pl-3 text-[11px] font-mono text-muted">
                    {t.toolEvents.map((e, k) => (
                      <li key={k}>
                        <span className="text-ink">{e.name}</span>
                        {" "}
                        <span>{JSON.stringify(e.input)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
          {busy && (
            <div className="text-xs text-muted">Analyst is thinking…</div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}
      </div>

      <form
        className="border-t border-rule px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Tell the analyst what to do — e.g. 'set LTV to 75%'"
          className="w-full resize-none rounded-md border border-rule bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
          disabled={busy}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>Enter to send, Shift+Enter for a new line.</span>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md bg-ink px-3 py-1 text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Citation = {
  title?: string;
  source_url?: string;
  storage_path?: string;
  text?: string;
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [busy, setBusy] = useState(false);

  async function getAccessToken() {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function send() {
    const q = input.trim();
    if (!q) return;

    setBusy(true);
    setCitations([]);

    const token = await getAccessToken();
    if (!token) {
      setMessages((m) => [
        ...m,
        { role: "user", content: q },
        { role: "assistant", content: "Not logged in. Please sign in again." },
      ]);
      setBusy(false);
      setInput("");
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: q }),
    });

    const json = await res.json();

    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: json.answer ?? json.error ?? "No response." },
    ]);

    setCitations(json.citations ?? []);
    setInput("");
    setBusy(false);
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-violet-300">Chat</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Ask your documents anything
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            Grounded answers only. Natural wording. Real source-backed context.
          </p>
        </div>

        <div className="mb-5 max-h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-5">
          {messages.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Try: <span className="text-zinc-300">“What is this document about?”</span>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                    m.role === "user"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                      : "border border-white/10 bg-zinc-900/80 text-zinc-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your uploaded sources..."
            className="min-h-[92px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
          />

          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-2xl bg-violet-600 px-6 py-4 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>

      {citations.length > 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-5 text-sm font-medium text-fuchsia-300">
            Citations
          </div>

          <div className="grid gap-3">
            {citations.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="mb-1 text-sm font-medium text-white">
                  {c.title ?? "Source"}
                </div>
                <div className="mb-2 text-xs text-zinc-500">
                  {c.source_url ?? c.storage_path}
                </div>
                <div className="text-sm leading-7 text-zinc-300">{c.text}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
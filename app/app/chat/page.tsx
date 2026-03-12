"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Citation = {
  title?: string;
  source_url?: string;
  storage_path?: string;
  text?: string;
};

type ChatItem = {
  id: string;
  created_at: string;
  title: string;
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);

  async function getAccessToken() {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadChats() {
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch("/api/chats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    setChats(json.chats ?? []);
  }

  async function openChat(id: string) {
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch(`/api/chats/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();

    setChatId(id);
    setMessages(
      (json.messages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    );
    setCitations([]);
  }

  useEffect(() => {
    loadChats();
  }, []);

  async function send() {
    const q = input.trim();
    if (!q) return;

    setBusy(true);
    setCitations([]);

    const token = await getAccessToken();
    if (!token) {
      setBusy(false);
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: q,
        chatId,
      }),
    });

    const json = await res.json();

    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: json.answer ?? json.error ?? "No response." },
    ]);

    if (json.chatId) {
      setChatId(json.chatId);
    }

    setCitations(json.citations ?? []);
    setInput("");
    setBusy(false);

    await loadChats();
  }

  function newChat() {
    setChatId(null);
    setMessages([]);
    setCitations([]);
    setInput("");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-violet-300">Chats</div>
          <button
            onClick={newChat}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500"
          >
            New
          </button>
        </div>

        <div className="grid gap-2">
          {chats.length === 0 ? (
            <div className="text-sm text-zinc-500">No history yet.</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                  chatId === chat.id
                    ? "border-violet-400/40 bg-violet-500/10 text-white"
                    : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5"
                }`}
              >
                <div className="truncate font-medium">{chat.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {new Date(chat.created_at).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

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
    </div>
  );
}
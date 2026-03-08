"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const sb = supabaseBrowser();

    const { error } =
      mode === "login"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    window.location.href = "/app";
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-violet-300">
            Secure access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Email and password only. Clean and simple.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
              placeholder="••••••••"
            />
          </div>

          {msg ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {msg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 text-sm text-zinc-400 transition hover:text-white"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
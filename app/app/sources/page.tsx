"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SourceRow = {
  id: string;
  type: "pdf" | "url";
  title: string | null;
  source_url: string | null;
  storage_path: string | null;
  created_at: string;
};

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  async function getAccessToken(): Promise<string | null> {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadSources() {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setSources((data as any) ?? []);
  }

  useEffect(() => {
    loadSources();
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setMsg(f ? `Selected: ${f.name}` : null);
  }

  async function uploadSelectedPdf() {
    if (!selectedFile) {
      setMsg("Pick a PDF first.");
      return;
    }

    setBusy(true);
    setMsg("Uploading and indexing...");

    const token = await getAccessToken();
    if (!token) {
      setBusy(false);
      setMsg("Not logged in. Please sign in again.");
      return;
    }

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("title", selectedFile.name);

    let res: Response;
    try {
      res = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch (err: any) {
      setBusy(false);
      setMsg(`Network error: ${err?.message ?? "unknown"}`);
      return;
    }

    let json: any = null;
    let raw = "";
    try {
      raw = await res.text();
      json = raw ? JSON.parse(raw) : null;
    } catch {}

    setBusy(false);

    if (res.ok) {
      setMsg(
        `Uploaded + indexed ✅ (chunks: ${json?.chunks ?? "?"}, vectors: ${json?.vectors ?? "?"})`
      );
      setSelectedFile(null);
      await loadSources();
    } else {
      setMsg(json?.error ?? raw?.slice(0, 500) ?? `Upload failed (${res.status})`);
    }
  }

  async function addUrl() {
    if (!url.trim()) return;

    setBusy(true);
    setMsg("Adding URL and indexing...");

    const token = await getAccessToken();
    if (!token) {
      setBusy(false);
      setMsg("Not logged in. Please sign in again.");
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/add-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || url.trim(),
        }),
      });
    } catch (err: any) {
      setBusy(false);
      setMsg(`Network error: ${err?.message ?? "unknown"}`);
      return;
    }

    let json: any = null;
    let raw = "";
    try {
      raw = await res.text();
      json = raw ? JSON.parse(raw) : null;
    } catch {}

    setBusy(false);

    if (res.ok) {
      setMsg(`URL added + indexed ✅ (chunks: ${json?.chunks ?? "?"})`);
      setUrl("");
      setTitle("");
      await loadSources();
    } else {
      setMsg(json?.error ?? raw?.slice(0, 500) ?? `Add URL failed (${res.status})`);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-violet-300">
            Sources
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Upload and index knowledge
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            PDFs and URLs are turned into searchable vector knowledge for your
            assistant.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 text-sm font-medium text-white">Upload PDF</div>

            <input
              type="file"
              accept="application/pdf"
              onChange={onPickFile}
              disabled={busy}
              className="mb-4 block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500"
            />

            <button
              onClick={uploadSelectedPdf}
              disabled={busy || !selectedFile}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : "Upload PDF"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 text-sm font-medium text-white">Add URL</div>

            <div className="grid gap-3">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs"
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
              />

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                disabled={busy}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
              />

              <button
                onClick={addUrl}
                disabled={busy || !url.trim()}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Working..." : "Add URL"}
              </button>
            </div>
          </div>
        </div>

        {msg ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
            {msg}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-5 text-sm font-medium text-fuchsia-300">
          Your indexed sources
        </div>

        {sources.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-400">
            No sources yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {s.title ?? "(untitled)"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {s.type === "url" ? s.source_url : s.storage_path}
                  </div>
                </div>

                <div className="text-xs text-zinc-500">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
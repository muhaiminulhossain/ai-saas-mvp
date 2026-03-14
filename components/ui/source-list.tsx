"use client";

import { useEffect, useState } from "react";

type SourceItem = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
};

export default function SourceList() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSources() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/sources", {
        method: "GET",
        cache: "no-store",
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error("GET /api/sources returned non-JSON:", text);
        throw new Error("Sources API returned HTML instead of JSON");
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load sources");
      }

      setSources(data.sources || []);
    } catch (err) {
      console.error("Load sources error:", err);
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      setError(null);

      const res = await fetch(`/api/sources/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error("DELETE returned non-JSON:", text);
        throw new Error("Delete API returned HTML instead of JSON");
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete source");
      }

      setSources((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete source error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete source");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
        Loading sources...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {sources.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          No sources uploaded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {source.name}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {source.type.toUpperCase()} •{" "}
                  {new Date(source.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(source.id)}
                disabled={deletingId === source.id}
                className="ml-4 rounded-xl border border-red-800 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === source.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
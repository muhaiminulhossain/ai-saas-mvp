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
    return <div className="text-sm text-neutral-400">Loading sources...</div>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {sources.length === 0 ? (
        <div className="text-sm text-neutral-500">No sources uploaded yet.</div>
      ) : (
        sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 p-4"
          >
            <div>
              <div className="text-sm text-white">{source.name}</div>
              <div className="text-xs text-neutral-500">
                {source.type} • {new Date(source.createdAt).toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(source.id)}
              disabled={deletingId === source.id}
              className="rounded border border-red-700 px-3 py-1 text-sm text-red-300"
            >
              {deletingId === source.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
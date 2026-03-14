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

      if (!res.ok) {
        throw new Error(data.error || "Failed to load sources");
      }

      setSources(data.sources || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load sources");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);

      const res = await fetch(`/api/sources/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete source");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  if (loading) {
    return <div className="text-neutral-400">Loading sources...</div>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-red-400">{error}</div>}

      {sources.length === 0 && (
        <div className="text-neutral-500">No sources uploaded yet.</div>
      )}

      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between rounded-lg border border-neutral-800 p-3"
        >
          <div>
            <div className="text-white text-sm">{source.name}</div>
            <div className="text-neutral-500 text-xs">{source.type}</div>
          </div>

          <button
            onClick={() => handleDelete(source.id)}
            disabled={deletingId === source.id}
            className="text-red-400 text-sm"
          >
            {deletingId === source.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}
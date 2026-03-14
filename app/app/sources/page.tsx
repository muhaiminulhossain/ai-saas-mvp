"use client";

import { useEffect, useState } from "react";

type SourceItem = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
};

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a file first.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload file");
      }

      setSelectedFile(null);
      setSuccess("Source uploaded successfully.");
      await loadSources();
    } catch (err) {
      console.error("Upload source error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload source");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);
      setError(null);
      setSuccess(null);

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
      setSuccess("Source deleted successfully.");
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

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">Sources</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Manage uploaded files used by the AI knowledge base.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-lg font-medium text-white">Add Source</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Upload a file to add it to your source library.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Choose file
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="block w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-300 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-white"
                />
              </div>

              {selectedFile ? (
                <div className="rounded-lg border border-neutral-800 bg-black p-3 text-sm text-neutral-300">
                  Selected: {selectedFile.name}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Add Source"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Source History
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  View and manage uploaded sources.
                </p>
              </div>

              <button
                type="button"
                onClick={loadSources}
                disabled={loading}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                {success}
              </div>
            ) : null}

            <div className="mt-5">
              {loading ? (
                <div className="text-sm text-neutral-400">Loading sources...</div>
              ) : sources.length === 0 ? (
                <div className="text-sm text-neutral-500">
                  No sources uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-black p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {source.name}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {source.type.toUpperCase()} •{" "}
                          {new Date(source.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(source.id)}
                        disabled={deletingId === source.id}
                        className="ml-4 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === source.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
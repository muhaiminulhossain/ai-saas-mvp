"use client";

import { useEffect, useMemo, useState } from "react";

type SourceItem = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  meta?: {
    originalUrl?: string;
    pageCount?: number;
    notes?: string;
  };
};

type SourceMode = "file" | "url";

export default function SourcesPage() {
  const [mode, setMode] = useState<SourceMode>("file");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [crawlDepth, setCrawlDepth] = useState("2");
  const [includeSubpages, setIncludeSubpages] = useState(true);
  const [urlNotes, setUrlNotes] = useState("");

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

  async function handleUploadFile() {
    if (!selectedFile) {
      setError("Please choose a file first.");
      return;
    }

    try {
      setUploadingFile(true);
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
      setSuccess("File source added successfully.");
      await loadSources();
    } catch (err) {
      console.error("Upload file error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleAddUrl() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a website URL.");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL, including https://");
      return;
    }

    try {
      setAddingUrl(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/sources/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: trimmedUrl,
          crawlDepth: Number(crawlDepth),
          includeSubpages,
          notes: urlNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add URL source");
      }

      setUrl("");
      setCrawlDepth("2");
      setIncludeSubpages(true);
      setUrlNotes("");
      setSuccess("Website source added successfully.");
      await loadSources();
    } catch (err) {
      console.error("Add URL source error:", err);
      setError(err instanceof Error ? err.message : "Failed to add URL source");
    } finally {
      setAddingUrl(false);
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

  const sourceCountLabel = useMemo(() => {
    return sources.length === 1 ? "1 source" : `${sources.length} sources`;
  }, [sources.length]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Sources</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Add files or websites as source material for retrieval and content generation.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-lg font-medium text-white">Add Source</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Choose whether to upload a file or connect a website URL.
            </p>

            <div className="mt-5 inline-flex rounded-xl border border-neutral-800 bg-black p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("file");
                  setError(null);
                  setSuccess(null);
                }}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  mode === "file"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                Add File
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("url");
                  setError(null);
                  setSuccess(null);
                }}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  mode === "url"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                Add URL
              </button>
            </div>

            {mode === "file" ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    Choose file
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
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
                  onClick={handleUploadFile}
                  disabled={uploadingFile}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingFile ? "Uploading..." : "Add File Source"}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                      setSuccess(null);
                    }}
                    placeholder="https://example.com"
                    className="block w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-neutral-300">
                      Crawl depth
                    </label>
                    <select
                      value={crawlDepth}
                      onChange={(e) => setCrawlDepth(e.target.value)}
                      className="block w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200 outline-none"
                    >
                      <option value="1">1 level</option>
                      <option value="2">2 levels</option>
                      <option value="3">3 levels</option>
                      <option value="4">4 levels</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-300">
                      <input
                        type="checkbox"
                        checked={includeSubpages}
                        onChange={(e) => setIncludeSubpages(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Include subpages
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-300">
                    What should be extracted? <span className="text-neutral-500">(optional)</span>
                  </label>
                  <textarea
                    value={urlNotes}
                    onChange={(e) => setUrlNotes(e.target.value)}
                    rows={4}
                    placeholder="Example: Fetch homepage, product catalog, pricing, services, and structure it for LinkedIn/social content."
                    className="block w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={addingUrl}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingUrl ? "Adding URL..." : "Add Website Source"}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-white">Source History</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  View and manage all connected sources.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-400">
                  {sourceCountLabel}
                </span>
                <button
                  type="button"
                  onClick={loadSources}
                  disabled={loading}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
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
                <div className="text-sm text-neutral-500">No sources uploaded yet.</div>
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
                        {source.meta?.originalUrl ? (
                          <div className="mt-1 truncate text-xs text-neutral-500">
                            {source.meta.originalUrl}
                          </div>
                        ) : null}
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
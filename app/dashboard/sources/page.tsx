import SourceList from "@/components/source-list";

export default function SourcesPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Sources</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Manage uploaded files used by the AI knowledge base.
        </p>

        <div className="mt-8">
          <SourceList />
        </div>
      </div>
    </main>
  );
}
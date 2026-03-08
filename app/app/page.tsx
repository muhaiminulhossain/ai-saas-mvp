export default function AppHome() {
  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-3 text-sm font-medium text-violet-300">
          Dashboard
        </div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">
          Your AI document workspace
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-zinc-300">
          Upload sources, index them into Pinecone, and ask grounded questions.
          This is the control room, not the waiting room.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-violet-300">
            1. Add source
          </div>
          <p className="text-sm text-zinc-400">
            Upload a PDF or add a URL from the Sources page.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-fuchsia-300">
            2. Index content
          </div>
          <p className="text-sm text-zinc-400">
            The app extracts, chunks, embeds, and stores vectors for retrieval.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-sky-300">
            3. Ask questions
          </div>
          <p className="text-sm text-zinc-400">
            Chat with your documents using grounded answers and citations.
          </p>
        </div>
      </section>
    </div>
  );
}
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            RAG MVP • Upload PDFs • Ask grounded questions
          </div>

          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Turn documents into an{" "}
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              AI knowledge assistant
            </span>
          </h1>

          <p className="mb-8 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
            Upload documents, index them into Pinecone, and chat with answers
            grounded in your own sources. Clean dark UI. Zero fluff. Actual
            working RAG.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500"
            >
              Open dashboard
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-violet-300">
            Upload & Index
          </div>
          <p className="text-sm leading-6 text-zinc-300">
            PDFs are uploaded to Supabase Storage, extracted, chunked, embedded,
            and indexed in Pinecone.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-fuchsia-300">
            Grounded Chat
          </div>
          <p className="text-sm leading-6 text-zinc-300">
            Ask natural questions and get answers based on retrieved source
            chunks, not vibes and hallucinations.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-2 text-sm font-medium text-sky-300">
            MVP First
          </div>
          <p className="text-sm leading-6 text-zinc-300">
            Simple enough to debug, polished enough to demo, and structured
            enough to grow into a real AI SaaS.
          </p>
        </div>
      </section>
    </div>
  );
}
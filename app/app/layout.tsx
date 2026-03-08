import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
        <Link
          href="/app"
          className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          Overview
        </Link>
        <Link
          href="/app/sources"
          className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          Sources
        </Link>
        <Link
          href="/app/chat"
          className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          Chat
        </Link>
      </div>

      {children}
    </div>
  );
}
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AI Knowledge Assistant",
  description: "Christiani-style RAG MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent"
              >
                AI Knowledge Assistant
              </Link>

              <nav className="flex items-center gap-3 text-sm text-zinc-300">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white"
                >
                  Home
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
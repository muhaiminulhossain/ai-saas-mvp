import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedText } from "@/lib/openai";
import { pineconeIndex } from "@/lib/pinecone";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const admin = supabaseAdmin();
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const q = (body.q as string | undefined)?.trim();
    if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

    const vector = await embedText(q);
    const index = pineconeIndex();

    const result = await index.query({
      vector,
      topK: 5,
      includeMetadata: true,
    });

    const matches = result.matches ?? [];

    return NextResponse.json({
      ok: true,
      user_id: user.id,
      match_count: matches.length,
      matches: matches.map((m: any) => ({
        id: m.id,
        score: m.score,
        has_text: Boolean(m.metadata?.text),
        title: m.metadata?.title,
        source_id: m.metadata?.source_id,
        meta_keys: Object.keys(m.metadata || {}),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
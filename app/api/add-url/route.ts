import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripHtmlToText } from "@/lib/text-extract";
import { chunkText } from "@/lib/chunk";
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
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = userData.user;

    const body = await req.json();
    const url = (body.url as string | undefined)?.trim();
    const title = ((body.title as string | undefined)?.trim() || url) ?? null;

    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return NextResponse.json({ error: `Failed to fetch URL: ${r.status}` }, { status: 400 });

    const html = await r.text();
    const text = stripHtmlToText(html);
    if (!text) return NextResponse.json({ error: "Could not extract text from that page." }, { status: 400 });

    const ins = await admin
      .from("sources")
      .insert({ user_id: user.id, type: "url", title, source_url: url })
      .select("id")
      .single();

    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

    const sourceId = ins.data.id as string;

    const chunks = chunkText(text, 1200, 150);
    const index = pineconeIndex();

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);

      vectors.push({
        id: `${sourceId}:${i}`,
        values: embedding,
        metadata: {
          user_id: user.id,
          source_id: sourceId,
          type: "url",
          title,
          source_url: url,
          chunk_index: i,
          text: chunk.slice(0, 1000),
          created_at: new Date().toISOString(),
        },
      });
    }

    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      await index.upsert(vectors.slice(i, i + batchSize));
    }

    return NextResponse.json({ ok: true, source_id: sourceId, chunks: chunks.length });
  } catch (e: any) {
    console.error("ADD_URL ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
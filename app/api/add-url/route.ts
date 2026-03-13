import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripHtmlToText } from "@/lib/text-extract";
import { chunkText } from "@/lib/chunk";
import { embedText } from "@/lib/openai";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function pineconeUpsert(vectors: any[]) {
  const host = process.env.PINECONE_HOST;
  const apiKey = process.env.PINECONE_API_KEY;

  if (!host) throw new Error("Missing PINECONE_HOST");
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!vectors.length) throw new Error("No vectors passed to pineconeUpsert");

  const res = await fetch(`${host}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vectors }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Pinecone upsert failed (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(req: Request) {
  let sourceId: string | null = null;

  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = userData.user;

    const body = await req.json();
    const url = (body.url as string | undefined)?.trim();
    const title = ((body.title as string | undefined)?.trim() || url) ?? null;

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    let r: Response;
    try {
      r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Could not fetch URL: ${e?.message ?? "network error"}` },
        { status: 400 }
      );
    }

    if (!r.ok) {
      // NEVER pass external status codes directly.
      // Sites like LinkedIn may return nonstandard codes like 999.
      return NextResponse.json(
        { error: `This URL blocked access or could not be fetched (status: ${r.status}). Try a public article or docs page instead.` },
        { status: 400 }
      );
    }

    const html = await r.text();
    const text = stripHtmlToText(html);

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough readable text from that URL." },
        { status: 400 }
      );
    }

    const ins = await admin
      .from("sources")
      .insert({
        user_id: user.id,
        type: "url",
        title,
        source_url: url,
        status: "processing",
      })
      .select("id")
      .single();

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    sourceId = ins.data.id as string;

    const chunks = chunkText(text, 3000, 300);

    if (chunks.length === 0) {
      await admin.from("sources").update({ status: "failed" }).eq("id", sourceId);
      return NextResponse.json(
        { error: "No chunks were created from extracted webpage text." },
        { status: 400 }
      );
    }

    const vectors: any[] = [];
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
          text: chunk,
          created_at: new Date().toISOString(),
        },
      });
    }

    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeUpsert(batch);
    }

    await admin.from("sources").update({ status: "indexed" }).eq("id", sourceId);

    return NextResponse.json({
      ok: true,
      source_id: sourceId,
      chunks: chunks.length,
      vectors: vectors.length,
    });
  } catch (e: any) {
    console.error("ADD_URL ERROR:", e);

    if (sourceId) {
      const admin = supabaseAdmin();
      await admin.from("sources").update({ status: "failed" }).eq("id", sourceId);
    }

    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
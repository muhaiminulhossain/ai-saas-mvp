import { NextResponse } from "next/server";
import { embedText } from "@/lib/openai";
import { pineconeIndex } from "@/lib/pinecone";

export const runtime = "nodejs";

export async function GET() {
  try {
    const index = pineconeIndex();
    const vec = await embedText("pinecone self test");
    const id = `selftest-${Date.now()}`;

    await index.upsert({
      vectors: [{ id, values: vec, metadata: { kind: "selftest" } }],
    });

    const q = await index.query({
      vector: vec,
      topK: 3,
      includeMetadata: true,
    });

    return NextResponse.json({
      ok: true,
      embedding_len: vec.length,
      upserted_id: id,
      match_count: q.matches?.length ?? 0,
      matches: (q.matches ?? []).map((m: any) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Selftest failed" },
      { status: 500 }
    );
  }
}
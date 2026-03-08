import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const host = process.env.PINECONE_HOST;
    const apiKey = process.env.PINECONE_API_KEY;

    if (!host) throw new Error("Missing PINECONE_HOST");
    if (!apiKey) throw new Error("Missing PINECONE_API_KEY");

    const res = await fetch(`${host}/describe_index_stats`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Pinecone stats failed (${res.status}): ${text}`);
    }

    return NextResponse.json({
      ok: true,
      stats: JSON.parse(text),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to describe index stats" },
      { status: 500 }
    );
  }
}
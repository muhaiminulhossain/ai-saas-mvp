import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedText, chatAnswer } from "@/lib/openai";
import { pineconeIndex } from "@/lib/pinecone";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const message = (body.message as string | undefined)?.trim();

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const qEmbedding = await embedText(message);
    const index = pineconeIndex();

    const results = await index.query({
      vector: qEmbedding,
      topK: 6,
      includeMetadata: true,
    });

    const matches = results.matches ?? [];

    const citations = matches
      .map((m: any) => m.metadata)
      .filter(Boolean)
      .slice(0, 5);

    if (citations.length === 0) {
      return NextResponse.json({
        answer: "I don't know based on the provided sources.",
        citations: [],
      });
    }

    const contextBlocks = citations
      .map((c: any, i: number) => {
        const src = c.type === "url" ? c.source_url : c.storage_path;
        return `SOURCE ${i + 1} (${c.title ?? "Untitled"} | ${src})\n${c.text ?? ""}`;
      })
      .join("\n\n");

    const prompt = `
You are a helpful assistant.

Use the provided SOURCES as the factual basis for your answer.
You may explain or simplify the content in your own words for clarity.
Do not add facts that are not supported by the sources.

If the answer is not present in the sources, say exactly:
"I don't know based on the provided sources."

After the answer, include citations like:
Citations: SOURCE 1, SOURCE 2

QUESTION:
${message}

SOURCES:
${contextBlocks}
`;

    const answer = await chatAnswer(prompt);

    return NextResponse.json({
      answer,
      citations: citations.map((c: any) => ({
        title: c.title,
        source_url: c.source_url,
        storage_path: c.storage_path,
        text: (c.text ?? "").slice(0, 220),
      })),
    });
  } catch (e: any) {
    console.error("CHAT ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
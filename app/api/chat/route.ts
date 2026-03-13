import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { embedText, chatAnswer } from "@/lib/openai";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function pineconeQuery(vector: number[]) {
  const host = process.env.PINECONE_HOST;
  const apiKey = process.env.PINECONE_API_KEY;

  if (!host) throw new Error("Missing PINECONE_HOST");
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");

  const res = await fetch(`${host}/query`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector,
      topK: 10,
      includeMetadata: true,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Pinecone query failed (${res.status}): ${text}`);
  }

  return JSON.parse(text);
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

    const user = userData.user;

    const body = await req.json();
    const message = (body.message as string | undefined)?.trim();
    let chatId = body.chatId as string | undefined;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Create chat if not provided
    if (!chatId) {
      const newChat = await admin
        .from("chats")
        .insert({
          user_id: user.id,
        })
        .select("id")
        .single();

      if (newChat.error) {
        return NextResponse.json({ error: newChat.error.message }, { status: 500 });
      }

      chatId = newChat.data.id;
    }

    // Save user message
    const insertUserMsg = await admin.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content: message,
    });

    if (insertUserMsg.error) {
      return NextResponse.json({ error: insertUserMsg.error.message }, { status: 500 });
    }

    const qEmbedding = await embedText(message);
    const results = await pineconeQuery(qEmbedding);
    const matches = results.matches ?? [];

    const citations = matches
      .map((m: any) => m.metadata)
      .filter(Boolean)
      .slice(0, 10);

    if (citations.length === 0) {
      const noAnswer = "I don't know based on the provided sources.";

      await admin.from("messages").insert({
        chat_id: chatId,
        role: "assistant",
        content: noAnswer,
      });

      return NextResponse.json({
        chatId,
        answer: noAnswer,
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

    const insertAiMsg = await admin.from("messages").insert({
      chat_id: chatId,
      role: "assistant",
      content: answer,
    });

    if (insertAiMsg.error) {
      return NextResponse.json({ error: insertAiMsg.error.message }, { status: 500 });
    }

    return NextResponse.json({
      chatId,
      answer,
      citations: citations.map((c: any) => ({
        title: c.title,
        source_url: c.source_url,
        storage_path: c.storage_path,
        text: c.text ?? "",
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
// FILE: lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function embedText(text: string): Promise<number[]> {
  const input = (text ?? "").slice(0, 8000);

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
    // DO NOT set `dimensions` here.
    // Default is 1536 for text-embedding-3-small. :contentReference[oaicite:3]{index=3}
  });

  const v = res.data?.[0]?.embedding;

  if (!v || !Array.isArray(v) || v.length === 0) {
    throw new Error("Embedding failed: empty vector returned");
  }

  return v;
}

export async function chatAnswer(prompt: string) {
  const res = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  // responses API returns output_text
  // @ts-ignore
  return res.output_text as string;
}
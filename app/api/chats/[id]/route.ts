import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StoredSource = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  filePath?: string;
  namespace?: string;
};

type UrlSnapshotPage = {
  url: string;
  title: string;
  description?: string;
  content: string;
};

type UrlSnapshot = {
  id: string;
  sourceType: "url";
  url: string;
  crawlDepth: number;
  includeSubpages: boolean;
  notes?: string;
  pageCount: number;
  createdAt: string;
  pages: UrlSnapshotPage[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SOURCES_FILE = path.join(process.cwd(), "data", "sources.json");
const MAX_SOURCE_CHARS = 18000;

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getAllSources(): Promise<StoredSource[]> {
  const data = await readJsonFile<StoredSource[]>(SOURCES_FILE);
  return Array.isArray(data) ? data : [];
}

function trimText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
}

async function buildUrlSourceContext(source: StoredSource): Promise<string | null> {
  if (!source.filePath) return null;

  const absolutePath = path.join(process.cwd(), source.filePath);
  const snapshot = await readJsonFile<UrlSnapshot>(absolutePath);

  if (!snapshot || !Array.isArray(snapshot.pages) || snapshot.pages.length === 0) {
    return null;
  }

  const pageBlocks = snapshot.pages.map((page, index) => {
    const parts = [
      `Page ${index + 1}`,
      `URL: ${page.url}`,
      `Title: ${page.title || "Untitled"}`,
    ];

    if (page.description) {
      parts.push(`Description: ${page.description}`);
    }

    parts.push(`Content:\n${page.content || ""}`);

    return parts.join("\n");
  });

  const combined = [
    `SOURCE ID: ${source.id}`,
    `SOURCE NAME: ${source.name}`,
    `SOURCE TYPE: URL`,
    `ROOT URL: ${snapshot.url}`,
    snapshot.notes ? `NOTES: ${snapshot.notes}` : "",
    `PAGES CRAWLED: ${snapshot.pageCount}`,
    "",
    pageBlocks.join("\n\n---\n\n"),
  ]
    .filter(Boolean)
    .join("\n");

  return trimText(combined, MAX_SOURCE_CHARS);
}

async function buildAllSourceContext(): Promise<string> {
  const sources = await getAllSources();

  if (sources.length === 0) {
    return "No sources are currently available.";
  }

  const blocks: string[] = [];

  for (const source of sources) {
    if (source.type === "url") {
      const urlContext = await buildUrlSourceContext(source);
      if (urlContext) {
        blocks.push(urlContext);
      }
      continue;
    }

    // For non-URL sources, keep a lightweight placeholder for now.
    // You can expand this later to support PDFs/docs via chunk extraction.
    blocks.push(
      [
        `SOURCE ID: ${source.id}`,
        `SOURCE NAME: ${source.name}`,
        `SOURCE TYPE: ${source.type.toUpperCase()}`,
        `NOTE: This source is registered but full text retrieval is not implemented in this route yet.`,
      ].join("\n")
    );
  }

  return blocks.join("\n\n====================\n\n");
}

function buildSystemPrompt(sourceContext: string) {
  return `
You are a helpful assistant.

Use the provided SOURCES as the factual basis for your answer.
You may explain or simplify the content in your own words for clarity.
Do not add facts that are not supported by the sources.

If the answer is not present in the sources, say exactly:
"I don't know based on the provided sources."

When the answer is supported by website sources:
- Prefer the most relevant page content
- Mention the page title or URL when useful
- Be concise but informative

SOURCES:
${sourceContext}
`.trim();
}

function extractLatestUserMessage(messages: ChatMessage[]): string {
  const latest = [...messages].reverse().find((m) => m.role === "user");
  return latest?.content?.trim() || "";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await context.params;

    const body = await req.json();
    const incomingMessages = Array.isArray(body?.messages)
      ? (body.messages as ChatMessage[])
      : [];

    const latestUserMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : extractLatestUserMessage(incomingMessages);

    if (!latestUserMessage) {
      return NextResponse.json(
        { success: false, error: "Missing user message" },
        { status: 400 }
      );
    }

    const sourceContext = await buildAllSourceContext();
    const systemPrompt = buildSystemPrompt(sourceContext);

    const modelMessages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...incomingMessages.filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      ),
    ];

    if (!incomingMessages.length) {
      modelMessages.push({
        role: "user",
        content: latestUserMessage,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: modelMessages,
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I don't know based on the provided sources.";

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("POST /api/chats/[id] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate chat response" },
      { status: 500 }
    );
  }
}
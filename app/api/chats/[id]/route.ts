import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { getAllSources } from "@/lib/sources";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
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

const dataDir = path.join(process.cwd(), "data");
const chatsFile = path.join(dataDir, "chats.json");
const MAX_SOURCE_CHARS = 18000;

async function ensureChatsStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(chatsFile);
  } catch {
    await fs.writeFile(chatsFile, JSON.stringify([], null, 2), "utf-8");
  }
}

async function readChats(): Promise<ChatRecord[]> {
  await ensureChatsStore();
  const raw = await fs.readFile(chatsFile, "utf-8");
  return JSON.parse(raw) as ChatRecord[];
}

async function writeChats(chats: ChatRecord[]) {
  await ensureChatsStore();
  await fs.writeFile(chatsFile, JSON.stringify(chats, null, 2), "utf-8");
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function trimText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
}

async function buildSourceContext(): Promise<string> {
  const sources = await getAllSources();
  const blocks: string[] = [];

  for (const source of sources) {
    if (source.type === "url" && source.filePath) {
      const absolutePath = path.join(process.cwd(), source.filePath);
      const snapshot = await readJsonFile<UrlSnapshot>(absolutePath);

      if (snapshot?.pages?.length) {
        const pageText = snapshot.pages
          .map((page, index) => {
            return [
              `Page ${index + 1}`,
              `URL: ${page.url}`,
              `Title: ${page.title || "Untitled"}`,
              page.description ? `Description: ${page.description}` : "",
              `Content:\n${page.content || ""}`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n---\n\n");

        blocks.push(
          trimText(
            [
              `SOURCE ID: ${source.id}`,
              `SOURCE NAME: ${source.name}`,
              `SOURCE TYPE: URL`,
              snapshot.notes ? `NOTES: ${snapshot.notes}` : "",
              `ROOT URL: ${snapshot.url}`,
              `PAGES CRAWLED: ${snapshot.pageCount}`,
              "",
              pageText,
            ]
              .filter(Boolean)
              .join("\n"),
            MAX_SOURCE_CHARS
          )
        );
        continue;
      }
    }

    if (source.filePath) {
      try {
        const absolutePath = path.join(process.cwd(), source.filePath);
        const raw = await fs.readFile(absolutePath, "utf-8");

        blocks.push(
          trimText(
            [
              `SOURCE ID: ${source.id}`,
              `SOURCE NAME: ${source.name}`,
              `SOURCE TYPE: ${source.type.toUpperCase()}`,
              `Content:\n${raw}`,
            ].join("\n"),
            MAX_SOURCE_CHARS
          )
        );
      } catch {
        blocks.push(
          [
            `SOURCE ID: ${source.id}`,
            `SOURCE NAME: ${source.name}`,
            `SOURCE TYPE: ${source.type.toUpperCase()}`,
            `NOTE: Source exists but text could not be loaded.`,
          ].join("\n")
        );
      }
    }
  }

  if (!blocks.length) {
    return "No sources are currently available.";
  }

  return blocks.join("\n\n====================\n\n");
}

function buildSystemPrompt(sourceContext: string) {
  return `
You are a grounded AI sales, lead generation, and content strategy assistant.

Use the provided SOURCES as the factual basis for your answer.
You may explain or organize the content in your own words for clarity.
Do not invent facts that are not supported by the sources.

You can help with:
- website understanding
- product and service summaries
- lead strategy
- ICP ideas
- outreach angles
- sales pitch copy
- LinkedIn posts
- social media captions
- campaign messaging
- content strategy

Rules:
- If the user asks for strategy or content, ground it in the provided sources.
- If the sources are weak or incomplete, say what is missing.
- If the answer is not present in the sources, say exactly:
"I don't know based on the provided sources."
- When helpful, structure outputs into sections such as insights, positioning, lead strategy, pitch, and content ideas.

SOURCES:
${sourceContext}
`.trim();
}

function extractLatestUserMessage(messages: ChatMessage[]): string {
  const latest = [...messages].reverse().find((m) => m.role === "user");
  return latest?.content?.trim() || "";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chats = await readChats();
    const chat = chats.find((item) => item.id === id);

    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("GET /api/chats/[id] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chats = await readChats();
    const filtered = chats.filter((item) => item.id !== id);

    if (filtered.length === chats.length) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    await writeChats(filtered);

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("DELETE /api/chats/[id] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const incomingMessages = Array.isArray(body?.messages)
      ? (body.messages as ChatMessage[])
      : [];

    const userMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : extractLatestUserMessage(incomingMessages);

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: "Missing user message" },
        { status: 400 }
      );
    }

    const sourceContext = await buildSourceContext();
    const systemPrompt = buildSystemPrompt(sourceContext);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
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
        ...(incomingMessages.length
          ? []
          : [
              {
                role: "user" as const,
                content: userMessage,
              },
            ]),
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I don't know based on the provided sources.";

    const chats = await readChats();
    const existing = chats.find((item) => item.id === id);

    const updatedMessages: ChatMessage[] = incomingMessages.length
      ? [...incomingMessages, { role: "assistant", content: answer }]
      : [
          { role: "user", content: userMessage },
          { role: "assistant", content: answer },
        ];

    const now = new Date().toISOString();

    if (existing) {
      existing.messages = updatedMessages;
      existing.updatedAt = now;
      if (
        (!existing.title || existing.title === "New chat") &&
        userMessage.trim()
      ) {
        existing.title = userMessage.slice(0, 60);
      }
    } else {
      chats.unshift({
        id,
        title: userMessage.slice(0, 60) || "New chat",
        createdAt: now,
        updatedAt: now,
        messages: updatedMessages,
      });
    }

    await writeChats(chats);

    return NextResponse.json({
      success: true,
      answer,
      messages: updatedMessages,
    });
  } catch (error) {
    console.error("POST /api/chats/[id] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate chat response" },
      { status: 500 }
    );
  }
}
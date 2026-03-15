import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

const dataDir = path.join(process.cwd(), "data");
const chatsFile = path.join(dataDir, "chats.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(chatsFile);
  } catch {
    await fs.writeFile(chatsFile, JSON.stringify([], null, 2), "utf-8");
  }
}

async function readChats(): Promise<ChatRecord[]> {
  await ensureStore();
  const raw = await fs.readFile(chatsFile, "utf-8");
  return JSON.parse(raw) as ChatRecord[];
}

export async function GET() {
  try {
    const chats = await readChats();

    return NextResponse.json({
      success: true,
      chats: chats.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    });
  } catch (error) {
    console.error("GET /api/chats failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}
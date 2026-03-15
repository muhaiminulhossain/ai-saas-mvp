"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

type ChatSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  chats: ChatSummary[];
  activeChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat?: (chatId: string) => Promise<void> | void;
};

export default function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(chatId: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!onDeleteChat) return;

    try {
      setDeletingId(chatId);
      await onDeleteChat(chatId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-violet-200">Chats</h2>

        <button
          type="button"
          onClick={onCreateChat}
          className="rounded-3xl bg-gradient-to-b from-violet-500 to-purple-600 px-5 py-3 text-lg font-semibold text-white shadow-lg"
        >
          New
        </button>
      </div>

      <div className="space-y-3">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;

          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={`group w-full rounded-[26px] border px-5 py-4 text-left transition ${
                isActive
                  ? "border-violet-400/70 bg-violet-500/15 shadow-[0_0_0_1px_rgba(167,139,250,0.25)]"
                  : "border-white/10 bg-white/5 hover:bg-white/8"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-semibold text-white">
                    {chat.title || "New chat"}
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    {new Date(chat.updatedAt || chat.createdAt).toLocaleString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(chat.id, e)}
                  className="opacity-70 transition hover:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {deletingId === chat.id ? (
                <div className="mt-2 text-xs text-red-300">Deleting...</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function GET(req: Request) {
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

    const chatsRes = await admin
      .from("chats")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (chatsRes.error) {
      return NextResponse.json({ error: chatsRes.error.message }, { status: 500 });
    }

    const chats = chatsRes.data ?? [];

    const withPreview = await Promise.all(
      chats.map(async (chat) => {
        const firstUserMsg = await admin
          .from("messages")
          .select("content")
          .eq("chat_id", chat.id)
          .eq("role", "user")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        return {
          ...chat,
          title: firstUserMsg.data?.content?.slice(0, 60) || "New chat",
        };
      })
    );

    return NextResponse.json({ chats: withPreview });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
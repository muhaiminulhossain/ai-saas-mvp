import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params;

    const chatRes = await admin
      .from("chats")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (chatRes.error) {
      return NextResponse.json({ error: chatRes.error.message }, { status: 500 });
    }

    if (!chatRes.data) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const msgRes = await admin
      .from("messages")
      .select("id, role, content, created_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });

    if (msgRes.error) {
      return NextResponse.json({ error: msgRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: msgRes.data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { supabase, responseHeaders } = supabaseRoute(req);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: responseHeaders }
      );
    }

    const body = await req.json();
    const title = body.title?.trim() || "New Chat";

    const { data, error } = await supabase
      .from("chats")
      .insert({
        title,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        chat: data,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Create chat error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
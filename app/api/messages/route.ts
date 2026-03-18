import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { chat_id, role, content } = body;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role,
        content,
        user_id: user.id, // 🔥 REQUIRED for RLS
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: data,
    });
  } catch (error) {
    console.error("Insert message error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to insert message" },
      { status: 500 }
    );
  }
}
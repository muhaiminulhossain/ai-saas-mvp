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
    const { chat_id, role, content } = body;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role,
        content,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        message: data,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Insert message error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to insert message" },
      { status: 500 }
    );
  }
}
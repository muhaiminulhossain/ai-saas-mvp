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
    const { name, type, filePath, meta } = body;

    const { data, error } = await supabase
      .from("sources")
      .insert({
        name,
        type,
        file_path: filePath,
        meta,
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
        source: data,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("Insert source error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to insert source" },
      { status: 500 }
    );
  }
}
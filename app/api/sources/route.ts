import { NextResponse } from "next/server";
import { getAllSources } from "@/lib/sources";

export async function GET() {
  try {
    const sources = await getAllSources();

    return NextResponse.json({
      success: true,
      sources,
    });
  } catch (error) {
    console.error("GET /api/sources failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
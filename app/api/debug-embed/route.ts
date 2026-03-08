import { NextResponse } from "next/server";
import { embedText } from "@/lib/openai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const v = await embedText("hello world");
    return NextResponse.json({
      ok: true,
      length: Array.isArray(v) ? v.length : null,
      first3: Array.isArray(v) ? v.slice(0, 3) : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "embed failed" },
      { status: 500 }
    );
  }
}
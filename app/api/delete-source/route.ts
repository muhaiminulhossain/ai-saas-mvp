import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function pineconeDeleteBySourceId(sourceId: string) {
  const host = process.env.PINECONE_HOST;
  const apiKey = process.env.PINECONE_API_KEY;

  if (!host) throw new Error("Missing PINECONE_HOST");
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");

  const res = await fetch(`${host}/vectors/delete`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        source_id: { "$eq": sourceId },
      },
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Pinecone delete failed (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();
    const sourceId = body.sourceId as string;

    if (!sourceId) {
      return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
    }

    const sourceRes = await admin
      .from("sources")
      .select("id, user_id, storage_path")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .single();

    if (sourceRes.error || !sourceRes.data) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const source = sourceRes.data;

    // 1) Delete from Pinecone
    await pineconeDeleteBySourceId(source.id);

    // 2) Delete file from Supabase Storage if exists
    if (source.storage_path) {
      await admin.storage.from("documents").remove([source.storage_path]);
    }

    // 3) Delete DB row
    const delRes = await admin.from("sources").delete().eq("id", source.id);

    if (delRes.error) {
      return NextResponse.json({ error: delRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE_SOURCE ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
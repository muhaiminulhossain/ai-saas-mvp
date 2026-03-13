import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chunkText } from "@/lib/chunk";
import { embedText } from "@/lib/openai";

import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function extractTextWithPdftotext(pdfBytes: Uint8Array) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-"));
  const pdfPath = path.join(tmpDir, "doc.pdf");

  await fs.writeFile(pdfPath, Buffer.from(pdfBytes));

  try {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      maxBuffer: 50 * 1024 * 1024,
    });

    return (stdout ?? "").trim();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function pineconeUpsert(vectors: any[]) {
  const host = process.env.PINECONE_HOST;
  const apiKey = process.env.PINECONE_API_KEY;

  if (!host) throw new Error("Missing PINECONE_HOST");
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!vectors.length) throw new Error("No vectors passed to pineconeUpsert");

  const res = await fetch(`${host}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vectors,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Pinecone upsert failed (${res.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function POST(req: Request) {
  try {
    console.log("UPLOAD_PDF: start");

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
    console.log("UPLOAD_PDF: user", user.id);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const title = (form.get("title") as string | null) ?? "document.pdf";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const upload = await admin.storage.from("documents").upload(storagePath, bytes, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

    if (upload.error) {
      console.error("UPLOAD_PDF: storage error", upload.error);
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    console.log("UPLOAD_PDF: storage ok", storagePath);

    const insert = await admin
      .from("sources")
      .insert({
        user_id: user.id,
        type: "pdf",
        title,
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (insert.error) {
      console.error("UPLOAD_PDF: DB error", insert.error);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    const sourceId = insert.data.id as string;

    let text = "";
    try {
      text = await extractTextWithPdftotext(bytes);
    } catch (e: any) {
      console.error("UPLOAD_PDF: pdftotext error", e);
      return NextResponse.json(
        {
          error: "PDF text extraction failed. Install pdftotext with: brew install poppler",
        },
        { status: 500 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from PDF (empty output)." },
        { status: 400 }
      );
    }

    console.log("UPLOAD_PDF: extracted chars", text.length);

    const chunks = chunkText(text, 3000, 300);
    console.log("UPLOAD_PDF: chunks created", chunks.length);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No chunks were created from extracted PDF text." },
        { status: 400 }
      );
    }

    const vectors: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);

      vectors.push({
        id: `${sourceId}:${i}`,
        values: embedding,
        metadata: {
          user_id: user.id,
          source_id: sourceId,
          type: "pdf",
          title,
          storage_path: storagePath,
          chunk_index: i,
          text: chunk,
          created_at: new Date().toISOString(),
        },
      });
    }

    console.log("UPLOAD_PDF: vectors prepared", vectors.length);

    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log("UPLOAD_PDF: upserting batch", batch.length);

      const upsertResult = await pineconeUpsert(batch);
      console.log("UPLOAD_PDF: upsert result", upsertResult);
    }

    console.log("UPLOAD_PDF: pinecone upsert ok", vectors.length);

    return NextResponse.json({
      ok: true,
      source_id: sourceId,
      chunks: chunks.length,
      vectors: vectors.length,
    });
  } catch (e: any) {
    console.error("UPLOAD_PDF ERROR:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { addSource } from "@/lib/sources";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const filePath = path.join(uploadsDir, safeName);

    await fs.writeFile(filePath, buffer);

    const source = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.name.split(".").pop()?.toLowerCase() || "unknown",
      createdAt: new Date().toISOString(),
      filePath: path.join("uploads", safeName),
    };

    await addSource(source);

    return NextResponse.json({
      success: true,
      source,
    });
  } catch (error) {
    console.error("POST /api/upload failed:", error);

    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
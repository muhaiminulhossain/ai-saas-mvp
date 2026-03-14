import { NextRequest, NextResponse } from "next/server";
import { deleteSourceById, getSourceById } from "@/lib/sources";

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing source id" },
        { status: 400 }
      );
    }

    const existing = await getSourceById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Source not found" },
        { status: 404 }
      );
    }

    const deleted = await deleteSourceById(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete source" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Source deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    console.error("DELETE /api/sources/[id] failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
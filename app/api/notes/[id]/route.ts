import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch note." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Note not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: {
      title?: string;
      content?: string | null;
      category?: string | null;
      tags?: string | null;
      pinned?: boolean;
    } = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json(
          { success: false, error: "Title cannot be empty." },
          { status: 400 }
        );
      }
      data.title = title;
    }

    if (body.content !== undefined) {
      if (body.content === null) {
        data.content = null;
      } else if (typeof body.content === "string") {
        data.content = body.content.trim();
      } else {
        return NextResponse.json(
          { success: false, error: "content must be a string or null." },
          { status: 400 }
        );
      }
    }

    if (body.category !== undefined) {
      if (body.category === null) {
        data.category = null;
      } else if (typeof body.category === "string") {
        data.category = body.category.trim();
      } else {
        return NextResponse.json(
          { success: false, error: "category must be a string or null." },
          { status: 400 }
        );
      }
    }

    if (body.tags !== undefined) {
      if (body.tags === null) {
        data.tags = null;
      } else if (typeof body.tags === "string") {
        data.tags = body.tags.trim();
      } else {
        return NextResponse.json(
          { success: false, error: "tags must be a string or null." },
          { status: 400 }
        );
      }
    }

    if (body.pinned !== undefined) {
      if (typeof body.pinned !== "boolean") {
        return NextResponse.json(
          { success: false, error: "pinned must be a boolean." },
          { status: 400 }
        );
      }
      data.pinned = body.pinned;
    }

    const note = await prisma.note.update({ where: { id }, data });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update note." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Note not found." },
        { status: 404 }
      );
    }

    await prisma.note.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Note deleted." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete note." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, notes });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }

    const data: {
      title: string;
      content?: string;
      category?: string;
      tags?: string;
      pinned?: boolean;
    } = { title };

    if (body.content !== undefined) {
      if (typeof body.content !== "string") {
        return NextResponse.json(
          { success: false, error: "content must be a string." },
          { status: 400 }
        );
      }
      if (body.content.trim()) data.content = body.content.trim();
    }

    if (body.category !== undefined) {
      if (typeof body.category !== "string") {
        return NextResponse.json(
          { success: false, error: "category must be a string." },
          { status: 400 }
        );
      }
      if (body.category.trim()) data.category = body.category.trim();
    }

    if (body.tags !== undefined) {
      if (typeof body.tags !== "string") {
        return NextResponse.json(
          { success: false, error: "tags must be a string." },
          { status: 400 }
        );
      }
      if (body.tags.trim()) data.tags = body.tags.trim();
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

    const note = await prisma.note.create({ data });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create note." },
      { status: 500 }
    );
  }
}
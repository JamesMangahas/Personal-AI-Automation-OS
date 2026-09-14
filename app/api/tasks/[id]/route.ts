import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch task." },
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
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Task not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      priority?: "LOW" | "MEDIUM" | "HIGH";
      dueDate?: Date | null;
      category?: string | null;
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

    if (body.description !== undefined) {
      if (body.description === null) {
        data.description = null;
      } else if (typeof body.description === "string") {
        data.description = body.description.trim();
      } else {
        return NextResponse.json(
          { success: false, error: "description must be a string or null." },
          { status: 400 }
        );
      }
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== "boolean") {
        return NextResponse.json(
          { success: false, error: "completed must be a boolean." },
          { status: 400 }
        );
      }
      data.completed = body.completed;
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { success: false, error: "Priority must be LOW, MEDIUM, or HIGH." },
          { status: 400 }
        );
      }
      data.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        data.dueDate = null;
      } else {
        const parsedDate = new Date(body.dueDate);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "dueDate must be a valid date." },
            { status: 400 }
          );
        }
        data.dueDate = parsedDate;
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

    const task = await prisma.task.update({ where: { id }, data });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update task." },
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
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Task not found." },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Task deleted." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete task." },
      { status: 500 }
    );
  }
}

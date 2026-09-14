import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks." },
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
      description?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH";
      dueDate?: Date;
      category?: string;
    } = { title };

    if (typeof body.description === "string" && body.description.trim()) {
      data.description = body.description.trim();
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
      const parsedDate = new Date(body.dueDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "dueDate must be a valid date." },
          { status: 400 }
        );
      }
      data.dueDate = parsedDate;
    }

    if (typeof body.category === "string" && body.category.trim()) {
      data.category = body.category.trim();
    }

    const task = await prisma.task.create({ data });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create task." },
      { status: 500 }
    );
  }
}

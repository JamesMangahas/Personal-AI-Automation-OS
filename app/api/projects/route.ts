import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const VALID_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const data: {
      name: string;
      description?: string;
      status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
      priority?: "LOW" | "MEDIUM" | "HIGH";
      category?: string;
      startDate?: Date;
      dueDate?: Date;
    } = { name };

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return NextResponse.json(
          { success: false, error: "description must be a string." },
          { status: 400 }
        );
      }
      if (body.description.trim()) data.description = body.description.trim();
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `status must be one of: ${VALID_STATUSES.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { success: false, error: "priority must be LOW, MEDIUM, or HIGH." },
          { status: 400 }
        );
      }
      data.priority = body.priority;
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

    if (body.startDate !== undefined) {
      const parsedDate = new Date(body.startDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "startDate must be a valid date." },
          { status: 400 }
        );
      }
      data.startDate = parsedDate;
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

    const project = await prisma.project.create({ data });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create project." },
      { status: 500 }
    );
  }
}
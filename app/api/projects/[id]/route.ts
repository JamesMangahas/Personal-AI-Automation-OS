import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const VALID_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch project." },
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
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: {
      name?: string;
      description?: string | null;
      status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
      priority?: "LOW" | "MEDIUM" | "HIGH";
      category?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
    } = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { success: false, error: "Name cannot be empty." },
          { status: 400 }
        );
      }
      data.name = name;
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

    if (body.startDate !== undefined) {
      if (body.startDate === null) {
        data.startDate = null;
      } else {
        const parsedDate = new Date(body.startDate);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "startDate must be a valid date." },
            { status: 400 }
          );
        }
        data.startDate = parsedDate;
      }
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

    const project = await prisma.project.update({ where: { id }, data });

    return NextResponse.json({ success: true, project });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update project." },
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
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Project not found." },
        { status: 404 }
      );
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Project deleted." });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete project." },
      { status: 500 }
    );
  }
}
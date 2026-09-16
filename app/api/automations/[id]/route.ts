import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "ERROR"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const automation = await prisma.automation.findUnique({ where: { id } });

    if (!automation) {
      return NextResponse.json(
        { success: false, error: "Automation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, automation });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch automation." },
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
    const existing = await prisma.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, string | Date | null> = {};

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

    const nullableStringFields = ["description", "trigger", "webhookUrl"];
    for (const field of nullableStringFields) {
      if (body[field] !== undefined) {
        if (body[field] === null) {
          data[field] = null;
        } else if (typeof body[field] === "string") {
          data[field] = body[field].trim();
        } else {
          return NextResponse.json(
            { success: false, error: `${field} must be a string or null.` },
            { status: 400 }
          );
        }
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

    for (const field of ["lastRunAt", "nextRunAt"]) {
      if (body[field] !== undefined) {
        if (body[field] === null) {
          data[field] = null;
        } else {
          const parsed = new Date(body[field]);
          if (isNaN(parsed.getTime())) {
            return NextResponse.json(
              { success: false, error: `${field} must be a valid date.` },
              { status: 400 }
            );
          }
          data[field] = parsed;
        }
      }
    }

    const automation = await prisma.automation.update({ where: { id }, data });

    return NextResponse.json({ success: true, automation });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update automation." },
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
    const existing = await prisma.automation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation not found." },
        { status: 404 }
      );
    }

    await prisma.automation.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Automation deleted." });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete automation." },
      { status: 500 }
    );
  }
}
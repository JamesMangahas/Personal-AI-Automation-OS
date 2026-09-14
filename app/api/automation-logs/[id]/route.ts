import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const VALID_STATUSES = ["SUCCESS", "FAILED"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const log = await prisma.automationLog.findUnique({
      where: { id },
      include: { automation: { select: { id: true, name: true } } },
    });

    if (!log) {
      return NextResponse.json(
        { success: false, error: "Automation log not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch automation log." },
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
    const existing = await prisma.automationLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation log not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, string | number | null> = {};

    if (body.automationId !== undefined) {
      const automationId =
        typeof body.automationId === "string" ? body.automationId.trim() : "";
      if (!automationId) {
        return NextResponse.json(
          { success: false, error: "automationId cannot be empty." },
          { status: 400 }
        );
      }
      const automation = await prisma.automation.findUnique({ where: { id: automationId } });
      if (!automation) {
        return NextResponse.json(
          { success: false, error: "automationId does not refer to an existing automation." },
          { status: 400 }
        );
      }
      data.automationId = automationId;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}.` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.executionTime !== undefined) {
      if (body.executionTime === null || body.executionTime === "") {
        data.executionTime = null;
      } else {
        const executionTime = Number(body.executionTime);
        if (!Number.isFinite(executionTime) || executionTime < 0) {
          return NextResponse.json(
            { success: false, error: "executionTime must be a non-negative number." },
            { status: 400 }
          );
        }
        data.executionTime = Math.round(executionTime);
      }
    }

    const nullableStringFields = ["error", "input", "output"];
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

    const log = await prisma.automationLog.update({
      where: { id },
      data,
      include: { automation: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update automation log." },
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
    const existing = await prisma.automationLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation log not found." },
        { status: 404 }
      );
    }

    await prisma.automationLog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Automation log deleted." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete automation log." },
      { status: 500 }
    );
  }
}
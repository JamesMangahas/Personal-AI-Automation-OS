import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { LogStatus } from "../../../app/generated/prisma/client";

const VALID_STATUSES = [LogStatus.SUCCESS, LogStatus.FAILED];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get("automationId");
    const statusParam = searchParams.get("status");

    const where: { automationId?: string; status?: LogStatus } = {};
    if (automationId) where.automationId = automationId;
    if (statusParam && VALID_STATUSES.includes(statusParam as LogStatus)) {
      where.status = statusParam as LogStatus;
    }

    const logs = await prisma.automationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { automation: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, logs });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch automation logs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const automationId =
      typeof body.automationId === "string" ? body.automationId.trim() : "";

    if (!automationId) {
      return NextResponse.json(
        { success: false, error: "automationId is required." },
        { status: 400 }
      );
    }

    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      return NextResponse.json(
        { success: false, error: "automationId does not refer to an existing automation." },
        { status: 400 }
      );
    }

    if (
      typeof body.status !== "string" ||
      !VALID_STATUSES.includes(body.status as LogStatus)
    ) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    const data: {
      automationId: string;
      status: LogStatus;
      executionTime?: number;
      error?: string;
      input?: string;
      output?: string;
    } = {
      automationId,
      status: body.status as LogStatus,
    };

    if (
      body.executionTime !== undefined &&
      body.executionTime !== null &&
      body.executionTime !== ""
    ) {
      const executionTime = Number(body.executionTime);

      if (!Number.isFinite(executionTime) || executionTime < 0) {
        return NextResponse.json(
          { success: false, error: "executionTime must be a non-negative number." },
          { status: 400 }
        );
      }

      data.executionTime = Math.round(executionTime);
    }

    for (const dataKey of ["error", "input", "output"] as const) {
      if (body[dataKey] !== undefined) {
        if (typeof body[dataKey] !== "string") {
          return NextResponse.json(
            { success: false, error: `${dataKey} must be a string.` },
            { status: 400 }
          );
        }

        const value = body[dataKey].trim();
        if (value) data[dataKey] = value;
      }
    }

    const log = await prisma.automationLog.create({
      data,
      include: { automation: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create automation log." },
      { status: 500 }
    );
  }
}

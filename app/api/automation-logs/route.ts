import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const VALID_STATUSES = ["SUCCESS", "FAILED"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get("automationId");
    const statusParam = searchParams.get("status");

    const where: Record<string, string> = {};
    if (automationId) where.automationId = automationId;
    if (statusParam && VALID_STATUSES.includes(statusParam)) where.status = statusParam;

    const logs = await prisma.automationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { automation: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
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

    const automation = await prisma.automation.findUnique({ where: { id: automationId } });
    if (!automation) {
      return NextResponse.json(
        { success: false, error: "automationId does not refer to an existing automation." },
        { status: 400 }
      );
    }

    if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    const data: {
      automationId: string;
      status: string;
      executionTime?: number;
      error?: string;
      input?: string;
      output?: string;
    } = { automationId, status: body.status };

    if (body.executionTime !== undefined && body.executionTime !== null && body.executionTime !== "") {
      const executionTime = Number(body.executionTime);
      if (!Number.isFinite(executionTime) || executionTime < 0) {
        return NextResponse.json(
          { success: false, error: "executionTime must be a non-negative number." },
          { status: 400 }
        );
      }
      data.executionTime = Math.round(executionTime);
    }

    const stringFields: Array<[string, string]> = [
      ["error", "error"],
      ["input", "input"],
      ["output", "output"],
    ];
    for (const [bodyKey, dataKey] of stringFields) {
      if (body[bodyKey] !== undefined) {
        if (typeof body[bodyKey] !== "string") {
          return NextResponse.json(
            { success: false, error: `${bodyKey} must be a string.` },
            { status: 400 }
          );
        }
        if (body[bodyKey].trim()) {
          (data as Record<string, string>)[dataKey] = body[bodyKey].trim();
        }
      }
    }

    const log = await prisma.automationLog.create({
      data,
      include: { automation: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create automation log." },
      { status: 500 }
    );
  }
}
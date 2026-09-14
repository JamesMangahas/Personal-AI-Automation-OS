import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "ERROR"];

export async function GET() {
  try {
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, automations });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch automations." },
      { status: 500 }
    );
  }
}

function parseOptionalDate(
  value: unknown,
  fieldName: string
): { ok: true; date?: Date } | { ok: false; error: string } {
  if (value === undefined) return { ok: true };
  if (value === null) return { ok: true, date: undefined };
  const parsed = new Date(value as string);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date.` };
  }
  return { ok: true, date: parsed };
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
      status?: string;
      trigger?: string;
      lastRunAt?: Date;
      nextRunAt?: Date;
      webhookUrl?: string;
    } = { name };

    const stringFields: Array<[string, string]> = [
      ["description", "description"],
      ["trigger", "trigger"],
      ["webhookUrl", "webhookUrl"],
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

    for (const bodyKey of ["lastRunAt", "nextRunAt"] as const) {
      const result = parseOptionalDate(body[bodyKey], bodyKey);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      if (result.date) {
        (data as Record<string, Date>)[bodyKey] = result.date;
      }
    }

    const automation = await prisma.automation.create({ data });

    return NextResponse.json({ success: true, automation }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create automation." },
      { status: 500 }
    );
  }
}
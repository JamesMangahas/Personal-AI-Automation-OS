import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const VALID_STATUSES = [
  "INTERESTED",
  "PREPARING",
  "APPLIED",
  "INTERVIEW",
  "ASSESSMENT",
  "OFFER",
  "REJECTED",
  "HIRED",
];

export async function GET() {
  try {
    const jobApplications = await prisma.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, jobApplications });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job applications." },
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

    const company = typeof body.company === "string" ? body.company.trim() : "";
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company is required." },
        { status: 400 }
      );
    }

    const position = typeof body.position === "string" ? body.position.trim() : "";
    if (!position) {
      return NextResponse.json(
        { success: false, error: "Position is required." },
        { status: 400 }
      );
    }

    const data: {
      company: string;
      position: string;
      url?: string;
      salary?: string;
      appliedDate?: Date;
      status?: string;
      interviewDate?: Date;
      contact?: string;
      notes?: string;
      followUpDate?: Date;
    } = { company, position };

    const stringFields: Array<[string, string]> = [
      ["url", "url"],
      ["salary", "salary"],
      ["contact", "contact"],
      ["notes", "notes"],
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

    for (const [bodyKey, label] of [
      ["appliedDate", "appliedDate"],
      ["interviewDate", "interviewDate"],
      ["followUpDate", "followUpDate"],
    ] as const) {
      const result = parseOptionalDate(body[bodyKey], label);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      if (result.date) {
        (data as Record<string, Date>)[bodyKey] = result.date;
      }
    }

    const jobApplication = await prisma.jobApplication.create({ data });

    return NextResponse.json({ success: true, jobApplication }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to create job application." },
      { status: 500 }
    );
  }
}
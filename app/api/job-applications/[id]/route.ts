import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const jobApplication = await prisma.jobApplication.findUnique({ where: { id } });

    if (!jobApplication) {
      return NextResponse.json(
        { success: false, error: "Job application not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, jobApplication });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch job application." },
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
    const existing = await prisma.jobApplication.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Job application not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: Record<string, string | Date | null> = {};

    if (body.company !== undefined) {
      const company = typeof body.company === "string" ? body.company.trim() : "";
      if (!company) {
        return NextResponse.json(
          { success: false, error: "Company cannot be empty." },
          { status: 400 }
        );
      }
      data.company = company;
    }

    if (body.position !== undefined) {
      const position = typeof body.position === "string" ? body.position.trim() : "";
      if (!position) {
        return NextResponse.json(
          { success: false, error: "Position cannot be empty." },
          { status: 400 }
        );
      }
      data.position = position;
    }

    const nullableStringFields = ["url", "salary", "contact", "notes"];
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

    const dateFields = ["appliedDate", "interviewDate", "followUpDate"];
    for (const field of dateFields) {
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

    const jobApplication = await prisma.jobApplication.update({ where: { id }, data });

    return NextResponse.json({ success: true, jobApplication });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update job application." },
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
    const existing = await prisma.jobApplication.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Job application not found." },
        { status: 404 }
      );
    }

    await prisma.jobApplication.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Job application deleted." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete job application." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

const IMPORT_DESCRIPTION = "Imported from Google Sheets";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { success: false, error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  console.log("[n8n webhook] payload received:", body);

  const payload = body as Record<string, unknown>;
  const name = typeof payload.Name === "string" ? payload.Name.trim() : "";
  const statusValue = typeof payload.Status === "string" ? payload.Status.trim() : "";
  const sourceRowId =
    typeof payload.sourceRowId === "string" && payload.sourceRowId.trim()
      ? payload.sourceRowId.trim()
      : undefined;

  if (!name) {
    return NextResponse.json(
      { success: false, error: "Name is required in the payload." },
      { status: 400 }
    );
  }

  try {
    if (sourceRowId) {
      const existingByRowId = await prisma.task.findUnique({
        where: { sourceRowId },
      });

      if (existingByRowId) {
        console.log(
          "[n8n webhook] duplicate detected by sourceRowId, skipping create:",
          existingByRowId.id
        );
        return NextResponse.json({
          success: true,
          message: "Webhook received",
          duplicate: true,
          taskId: existingByRowId.id,
        });
      }
    }

    const existingByNameAndDescription = await prisma.task.findFirst({
      where: {
        title: name,
        description: IMPORT_DESCRIPTION,
        sourceRowId: null,
      },
    });

    if (existingByNameAndDescription) {
      console.log(
        "[n8n webhook] duplicate detected by name+description, skipping create:",
        existingByNameAndDescription.id
      );
      return NextResponse.json({
        success: true,
        message: "Webhook received",
        duplicate: true,
        taskId: existingByNameAndDescription.id,
      });
    }

    const task = await prisma.task.create({
      data: {
        title: name,
        description: IMPORT_DESCRIPTION,
        completed: statusValue.toLowerCase() === "success",
        priority: "MEDIUM",
        ...(sourceRowId ? { sourceRowId } : {}),
      },
    });

    console.log("[n8n webhook] task created:", task.id);

    return NextResponse.json({
      success: true,
      message: "Webhook received",
      duplicate: false,
      taskId: task.id,
    });
  } catch (error) {
    console.error("[n8n webhook] failed to process webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task from webhook payload." },
      { status: 500 }
    );
  }
}
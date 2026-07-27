import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/services/errors";
import { NotFoundError } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string; reportId: string }> }) {
  try {
    await getCurrentUser(request);
    const { reportId } = await params;

    const [report] = await db
      .select()
      .from(aiReports)
      .where(and(eq(aiReports.id, reportId), eq(aiReports.status, "published")))
      .limit(1);
    if (!report) throw new NotFoundError("Published report");

    return Response.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}
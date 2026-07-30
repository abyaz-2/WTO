import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { disputes, finalReportFiles, finalReports } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/services/errors";
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    await getCurrentUser(request);
    const [file] = await db.select({ storagePath: finalReportFiles.storagePath })
      .from(finalReportFiles).innerJoin(finalReports, eq(finalReportFiles.reportId, finalReports.id)).innerJoin(disputes, eq(finalReports.disputeId, disputes.id))
      .where(and(eq(finalReportFiles.id, (await params).fileId), eq(disputes.status, "final_report_published"))).limit(1);
    if (!file) return new Response("Not found", { status: 404 });
    const { data, error } = await supabaseAdmin.storage.from("final-reports").createSignedUrl(file.storagePath, 60);
    if (error || !data) return new Response("Could not create download", { status: 500 });
    return Response.redirect(data.signedUrl);
  } catch (error) { return handleApiError(error); }
}

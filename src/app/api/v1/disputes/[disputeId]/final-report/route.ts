import crypto from "crypto";
import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { publishFinalReport } from "@/lib/services/dispute";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { handleApiError, ValidationError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  let uploadedPath: string | undefined;
  try {
    const user = await getCurrentUser(request); requireEb(user); await enforceRateLimit("publish_final_report", user.id, 10, 3600);
    const disputeId = (await params).disputeId;
    const form = await request.formData();
    const content = String(form.get("content") ?? "");
    const externalUrl = String(form.get("externalUrl") ?? "");
    const file = form.get("file");
    let uploaded: { storagePath: string; fileName: string; mimeType: string; fileSize: number } | undefined;
    if (file instanceof File && file.size) {
      const accepted = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!accepted.includes(file.type) || file.size > 10 * 1024 * 1024) throw new ValidationError("Upload a PDF or DOCX under 10 MB");
      const content = await file.arrayBuffer();
      const signature = Buffer.from(content).subarray(0, 5).toString("binary");
      if ((file.type === "application/pdf" && signature !== "%PDF-") || (file.type.includes("wordprocessingml") && signature.slice(0, 2) !== "PK")) throw new ValidationError("The uploaded file content does not match its declared PDF/DOCX type");
      const storagePath = `${disputeId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabaseAdmin.storage.from("final-reports").upload(storagePath, content, { contentType: file.type, upsert: false });
      if (error) throw new ValidationError(error.message);
      uploadedPath = storagePath;
      uploaded = { storagePath, fileName: file.name, mimeType: file.type, fileSize: file.size };
    }
    return Response.json(await publishFinalReport(disputeId, user.id, { content, externalUrl, file: uploaded }));
  } catch (error) {
    if (uploadedPath) await supabaseAdmin.storage.from("final-reports").remove([uploadedPath]).catch(() => undefined);
    return handleApiError(error);
  }
}

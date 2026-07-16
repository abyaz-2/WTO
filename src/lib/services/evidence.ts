import { db } from "@/lib/db";
import { evidence, issues, participants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/services/errors";

const ALLOWED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".tiff", ".tif",
  ".txt", ".csv", ".xlsx", ".xls",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function validateFileName(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((e) => lower.endsWith(e));
  if (!ext) {
    throw new ValidationError(
      `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }

  const nameWithoutExt = filename.slice(0, filename.length - ext.length);
  if (nameWithoutExt.includes(".") || nameWithoutExt.includes(" ")) {
    throw new ValidationError("Invalid file name: no double extensions or spaces allowed in name");
  }

  return ext;
}

async function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  return { supabaseUrl, serviceKey };
}

async function uploadToSupabase(
  bucket: string,
  path: string,
  fileBuffer: ArrayBuffer,
  contentType: string,
) {
  const { supabaseUrl, serviceKey } = await getSupabaseServiceClient();
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new ValidationError(`Failed to upload file to storage: ${err}`);
  }

  return { path, bucket };
}

async function deleteFromSupabase(bucket: string, path: string) {
  const { supabaseUrl, serviceKey } = await getSupabaseServiceClient();
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Failed to delete file from storage: ${err}`);
  }
}

export async function getSignedUrl(evidenceId: string, userId: string) {
  const [record] = await db.select().from(evidence).where(eq(evidence.id, evidenceId)).limit(1);
  if (!record) throw new NotFoundError("Evidence");

  const [participant] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.issueId, record.issueId), eq(participants.userId, userId)),
    )
    .limit(1);

  if (!participant) {
    const [userParticipant] = await db
      .select()
      .from(participants)
      .where(eq(participants.userId, userId))
      .limit(1);
    if (!userParticipant) throw new ForbiddenError("Not a participant of this issue");
  }

  const { supabaseUrl, serviceKey } = await getSupabaseServiceClient();
  const signedUrlEndpoint = `${supabaseUrl}/storage/v1/object/sign/${record.storagePath}`;

  const response = await fetch(signedUrlEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new ValidationError(`Failed to generate signed URL: ${err}`);
  }

  const result = await response.json();
  const signedUrl = `${supabaseUrl}${result.signedURL || result.url || ""}`;

  return signedUrl;
}

export async function uploadEvidence(
  issueId: string,
  formData: FormData,
  userId: string,
) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  if (issue.currentStatus !== "evidence_phase") {
    throw new ValidationError("Issue is not in evidence phase");
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.issueId, issueId),
        eq(participants.userId, userId),
        eq(participants.status, "active"),
      ),
    )
    .limit(1);
  if (!participant) throw new ForbiddenError("Not an active participant of this issue");

  const file = formData.get("file") as File | null;
  if (!file) throw new ValidationError("File is required");

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File size exceeds 50MB limit");
  }

  const ext = validateFileName(file.name);
  const description = (formData.get("description") as string) || null;

  const uuid = crypto.randomUUID();
  const storagePath = `issues/${issueId}/evidence/${uuid}_${file.name}`;
  const buffer = await file.arrayBuffer();

  await uploadToSupabase("evidence", storagePath, buffer, file.type);

  const [record] = await db
    .insert(evidence)
    .values({
      issueId,
      participantId: participant.id,
      fileUrl: storagePath,
      fileType: ext,
      fileSize: file.size,
      description,
      storagePath,
      status: "pending",
    })
    .returning();

  return record;
}

export async function deleteEvidence(
  issueId: string,
  evidenceId: string,
  userId: string,
  userRole: string,
) {
  const [record] = await db
    .select()
    .from(evidence)
    .where(and(eq(evidence.id, evidenceId), eq(evidence.issueId, issueId)))
    .limit(1);
  if (!record) throw new NotFoundError("Evidence");

  if (userRole !== "executive_board") {
    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, record.participantId))
      .limit(1);
    if (!participant || participant.userId !== userId) {
      throw new ForbiddenError("Not authorized to delete this evidence");
    }
  }

  await deleteFromSupabase("evidence", record.storagePath);
  await db.delete(evidence).where(eq(evidence.id, evidenceId));

  return { deleted: true };
}

export async function listEvidence(issueId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  return db
    .select()
    .from(evidence)
    .where(eq(evidence.issueId, issueId))
    .orderBy(desc(evidence.createdAt));
}

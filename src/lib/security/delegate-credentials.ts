import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { countryAssignments, delegateCredentials, securityAuditEvents } from "@/lib/db/schema";
import { NotFoundError, ValidationError } from "@/lib/services/errors";

function encryptionKey() {
  const configured = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!configured) throw new ValidationError("Missing CREDENTIAL_ENCRYPTION_KEY");
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32) throw new ValidationError("CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptCredential(password: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptCredential(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new ValidationError("Stored credential cannot be read");
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new ValidationError("Stored credential cannot be read");
  }
}

export async function storeDelegateCredential(countryAssignmentId: string, password: string) {
  await db.insert(delegateCredentials).values({ countryAssignmentId, encryptedSecret: encryptCredential(password) })
    .onConflictDoUpdate({ target: delegateCredentials.countryAssignmentId, set: { encryptedSecret: encryptCredential(password), updatedAt: new Date().toISOString() } });
}

export async function revealDelegateCredential(countryId: string, actorId: string) {
  const [credential] = await db.select({ encryptedSecret: delegateCredentials.encryptedSecret })
    .from(delegateCredentials)
    .innerJoin(countryAssignments, eq(delegateCredentials.countryAssignmentId, countryAssignments.id))
    .where(eq(countryAssignments.countryId, countryId))
    .limit(1);
  if (!credential) throw new NotFoundError("Stored credential");
  const password = decryptCredential(credential.encryptedSecret);
  await db.insert(securityAuditEvents).values({ actorId, action: "delegate_credential_revealed", targetId: countryId, detail: {} });
  return password;
}

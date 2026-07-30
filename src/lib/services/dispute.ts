import crypto from "crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  countryAssignments, disputeAuditEvents, disputeParties, disputes, disputeStatements,
  finalReportFiles, finalReports, notifications, thirdPartyResponses, users, wtoCountries,
} from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";

export const DISPUTE_STATUSES = ["pending_eb_review", "rejected", "third_party_response", "third_party_eb_review", "statements_open", "statements_closed", "final_report_published"] as const;
type DisputeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assignmentForUser(userId: string) {
  const [assignment] = await db.select({ id: countryAssignments.id, country: wtoCountries.name })
    .from(countryAssignments).innerJoin(wtoCountries, eq(countryAssignments.countryId, wtoCountries.id))
    .where(eq(countryAssignments.userId, userId)).limit(1);
  if (!assignment) throw new ValidationError("Your account is not assigned to a country");
  return assignment;
}

async function audit(tx: DisputeTransaction, disputeId: string, actorId: string, eventType: string, detail: Record<string, unknown> = {}) {
  await tx.insert(disputeAuditEvents).values({ disputeId, actorId, eventType, detail });
}

async function notifyAllDelegates(tx: DisputeTransaction, type: string, title: string, body: string, link: string) {
  const recipients = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, "delegate"), eq(users.isActive, true)));
  if (recipients.length) await tx.insert(notifications).values(recipients.map(({ id }) => ({ userId: id, type, content: { title, body, link } })));
}

async function notifyAssignments(tx: DisputeTransaction, assignmentIds: string[], type: string, title: string, body: string, link: string) {
  if (!assignmentIds.length) return;
  const recipients = await tx.select({ userId: countryAssignments.userId }).from(countryAssignments).where(inArray(countryAssignments.id, assignmentIds));
  if (recipients.length) await tx.insert(notifications).values(recipients.map(({ userId }) => ({ userId, type, content: { title, body, link } })));
}

export async function listCountries() {
  return db.select({ id: wtoCountries.id, name: wtoCountries.name, assignmentId: countryAssignments.id, email: users.email })
    .from(wtoCountries).leftJoin(countryAssignments, eq(countryAssignments.countryId, wtoCountries.id))
    .leftJoin(users, eq(users.id, countryAssignments.userId)).orderBy(asc(wtoCountries.sortOrder));
}

export async function createDispute(actorId: string, data: { title: string; description: string; complainantAssignmentIds: string[]; respondentAssignmentIds: string[] }) {
  const actorAssignment = await assignmentForUser(actorId);
  const complainants = [...new Set(data.complainantAssignmentIds)];
  const respondents = [...new Set(data.respondentAssignmentIds)];
  if (!data.title.trim() || !data.description.trim()) throw new ValidationError("Title and description are required");
  if (data.title.trim().length > 200 || data.description.trim().length > 20000) throw new ValidationError("Title or description exceeds the allowed length");
  if (!complainants.includes(actorAssignment.id)) throw new ValidationError("You must be a complainant in your dispute");
  if (!respondents.length) throw new ValidationError("At least one respondent is required");
  if (respondents.some((id) => complainants.includes(id))) throw new ValidationError("A country cannot be both complainant and respondent");
  const all = [...complainants, ...respondents];
  const valid = await db.select({ id: countryAssignments.id }).from(countryAssignments).where(inArray(countryAssignments.id, all));
  if (valid.length !== all.length) throw new ValidationError("All selected countries must have active delegate assignments");
  const disputeNumber = `DSB-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  return db.transaction(async (tx) => {
    const [dispute] = await tx.insert(disputes).values({ disputeNumber, title: data.title.trim(), description: data.description.trim(), createdBy: actorId }).returning();
    if (!dispute) throw new Error("Could not create dispute");
    await tx.insert(disputeParties).values([
      ...complainants.map((countryAssignmentId) => ({ disputeId: dispute.id, countryAssignmentId, role: "complainant" })),
      ...respondents.map((countryAssignmentId) => ({ disputeId: dispute.id, countryAssignmentId, role: "respondent" })),
    ]);
    await audit(tx, dispute.id, actorId, "dispute_created");
    return dispute;
  });
}

export async function ebDecision(disputeId: string, actorId: string, decision: "approve" | "reject") {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from disputes where id = ${disputeId} for update`);
    const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "pending_eb_review") throw new ValidationError("This dispute is no longer awaiting EB review");
    if (decision === "reject") {
      const [updated] = await tx.update(disputes).set({ status: "rejected", updatedAt: new Date().toISOString() }).where(eq(disputes.id, disputeId)).returning();
      await audit(tx, disputeId, actorId, "dispute_rejected");
      return updated;
    }
    await tx.update(disputes).set({ status: "third_party_response", updatedAt: new Date().toISOString() }).where(eq(disputes.id, disputeId));
    await audit(tx, disputeId, actorId, "third_party_response_opened");
    await notifyAllDelegates(tx, "third_party", "Third-party response required", `${dispute.title} is open for third-party responses.`, `/disputes/${disputeId}`);
    return { ...dispute, status: "third_party_response" };
  });
}

export async function respondThirdParty(disputeId: string, actorId: string, response: "yes" | "no") {
  const assignment = await assignmentForUser(actorId);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from disputes where id = ${disputeId} for update`);
    const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "third_party_response") throw new ValidationError("Third-party responses are closed");
    const existingParty = await tx.select({ id: disputeParties.id }).from(disputeParties).where(and(eq(disputeParties.disputeId, disputeId), eq(disputeParties.countryAssignmentId, assignment.id))).limit(1);
    if (existingParty.length) throw new ValidationError("A complainant or respondent cannot be a third party");
    await tx.insert(thirdPartyResponses).values({ disputeId, countryAssignmentId: assignment.id, response }).onConflictDoUpdate({ target: [thirdPartyResponses.disputeId, thirdPartyResponses.countryAssignmentId], set: { response, respondedAt: new Date().toISOString() } });
    const assigned = await tx.select({ id: countryAssignments.id }).from(countryAssignments);
    const parties = await tx.select({ countryAssignmentId: disputeParties.countryAssignmentId }).from(disputeParties).where(eq(disputeParties.disputeId, disputeId));
    const responses = await tx.select({ countryAssignmentId: thirdPartyResponses.countryAssignmentId }).from(thirdPartyResponses).where(eq(thirdPartyResponses.disputeId, disputeId));
    const partyIds = new Set(parties.map((party) => party.countryAssignmentId));
    const responseIds = new Set(responses.map((entry) => entry.countryAssignmentId));
    if (assigned.filter((entry) => !partyIds.has(entry.id)).every((entry) => responseIds.has(entry.id))) {
      await tx.update(disputes).set({ status: "third_party_eb_review", updatedAt: new Date().toISOString() }).where(and(eq(disputes.id, disputeId), eq(disputes.status, "third_party_response")));
      await audit(tx, disputeId, actorId, "third_party_responses_complete");
    }
  });
}

export async function finaliseThirdParties(disputeId: string, actorId: string, approvedAssignmentIds: string[]) {
  const approvedIds = [...new Set(approvedAssignmentIds)];
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from disputes where id = ${disputeId} for update`);
    const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "third_party_eb_review") throw new ValidationError("Waiting for every country to submit a third-party response");
    const assigned = await tx.select({ id: countryAssignments.id }).from(countryAssignments);
    const responses = await tx.select({ countryAssignmentId: thirdPartyResponses.countryAssignmentId, response: thirdPartyResponses.response }).from(thirdPartyResponses).where(eq(thirdPartyResponses.disputeId, disputeId));
    const partyRows = await tx.select({ countryAssignmentId: disputeParties.countryAssignmentId }).from(disputeParties).where(eq(disputeParties.disputeId, disputeId));
    const partyIds = new Set(partyRows.map((p) => p.countryAssignmentId));
    const answerIds = new Set(responses.map((r) => r.countryAssignmentId));
    const requiredAnswers = assigned.filter((a) => !partyIds.has(a.id));
    if (requiredAnswers.some((a) => !answerIds.has(a.id))) throw new ValidationError("Every non-party country must choose yes or no before EB can finalise");
    const yesIds = new Set(responses.filter((r) => r.response === "yes").map((r) => r.countryAssignmentId));
    if (approvedIds.some((id) => !yesIds.has(id))) throw new ValidationError("Only countries that opted in can be approved as third parties");
    if (approvedIds.length) await tx.insert(disputeParties).values(approvedIds.map((countryAssignmentId) => ({ disputeId, countryAssignmentId, role: "third_party" })));
    await tx.update(disputes).set({ status: "statements_open", updatedAt: new Date().toISOString() }).where(eq(disputes.id, disputeId));
    await audit(tx, disputeId, actorId, "third_parties_finalised", { approvedAssignmentIds: approvedIds });
    const finalParties = await tx.select({ countryAssignmentId: disputeParties.countryAssignmentId }).from(disputeParties).where(eq(disputeParties.disputeId, disputeId));
    await notifyAssignments(tx, finalParties.map((p) => p.countryAssignmentId), "statements", "Statement phase open", `${dispute.title} is ready for your statement.`, `/disputes/${disputeId}`);
  });
}

export async function submitStatement(disputeId: string, actorId: string, content: string) {
  if (!content.trim()) throw new ValidationError("Your statement cannot be empty");
  if (content.trim().length > 30000) throw new ValidationError("Your statement exceeds the 30,000 character limit");
  const assignment = await assignmentForUser(actorId);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from disputes where id = ${disputeId} for update`);
    const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "statements_open") throw new ValidationError("Statements are not open");
    const [party] = await tx.select().from(disputeParties).where(and(eq(disputeParties.disputeId, disputeId), eq(disputeParties.countryAssignmentId, assignment.id))).limit(1);
    if (!party) throw new ForbiddenError("You are not a final participant in this dispute");
    const created = await tx.insert(disputeStatements).values({ disputePartyId: party.id, content: content.trim() }).onConflictDoNothing().returning({ id: disputeStatements.id });
    if (!created.length) throw new ValidationError("Your final statement has already been submitted");
    await audit(tx, disputeId, actorId, "statement_submitted", { role: party.role });
  });
}

export async function closeStatements(disputeId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [dispute] = await tx.update(disputes).set({ status: "statements_closed", updatedAt: new Date().toISOString() }).where(and(eq(disputes.id, disputeId), eq(disputes.status, "statements_open"))).returning();
    if (!dispute) throw new ValidationError("Statements are not currently open");
    await audit(tx, disputeId, actorId, "statements_closed");
    return dispute;
  });
}

export async function publishFinalReport(disputeId: string, actorId: string, data: { content?: string; externalUrl?: string; file?: { storagePath: string; fileName: string; mimeType: string; fileSize: number } }) {
  if (!data.content?.trim() && !data.externalUrl?.trim() && !data.file) throw new ValidationError("Add report text, a link, or a PDF/DOCX file");
  if (data.content?.trim().length && data.content.trim().length > 50000) throw new ValidationError("Report text exceeds the 50,000 character limit");
  if (data.externalUrl?.trim()) {
    let url: URL;
    try { url = new URL(data.externalUrl.trim()); } catch { throw new ValidationError("Final report link must be a valid HTTPS URL"); }
    if (url.protocol !== "https:") throw new ValidationError("Final report link must use HTTPS");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from disputes where id = ${disputeId} for update`);
    const [dispute] = await tx.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "statements_closed") throw new ValidationError("Close statements before publishing the final report");
    const [report] = await tx.insert(finalReports).values({ disputeId, content: data.content?.trim() || null, externalUrl: data.externalUrl?.trim() || null, publishedBy: actorId }).returning();
    if (!report) throw new Error("Could not publish report");
    if (data.file) await tx.insert(finalReportFiles).values({ reportId: report.id, ...data.file });
    await tx.update(disputes).set({ status: "final_report_published", updatedAt: new Date().toISOString() }).where(eq(disputes.id, disputeId));
    await audit(tx, disputeId, actorId, "final_report_published");
    await notifyAllDelegates(tx, "final_report", "Final report published", `The final report for ${dispute.title} is now available.`, `/disputes/${disputeId}`);
    return report;
  });
}

export async function getDispute(disputeId: string, viewer?: { id: string; role: "executive_board" | "delegate" }) {
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
  if (!dispute) throw new NotFoundError("Dispute");
  const allParties = await db.select({ id: disputeParties.id, role: disputeParties.role, assignmentId: countryAssignments.id, country: wtoCountries.name, statement: disputeStatements.content, submittedAt: disputeStatements.submittedAt })
    .from(disputeParties).innerJoin(countryAssignments, eq(disputeParties.countryAssignmentId, countryAssignments.id)).innerJoin(wtoCountries, eq(countryAssignments.countryId, wtoCountries.id)).leftJoin(disputeStatements, eq(disputeStatements.disputePartyId, disputeParties.id)).where(eq(disputeParties.disputeId, disputeId));
  let viewerAssignmentId: string | undefined;
  if (viewer?.role === "delegate") {
    viewerAssignmentId = (await assignmentForUser(viewer.id)).id;
    const isParty = allParties.some((party) => party.assignmentId === viewerAssignmentId);
    if (!isParty && dispute.status !== "third_party_response" && dispute.status !== "final_report_published") throw new ForbiddenError("This dispute is not available to your country");
  }
  const allResponses = await db.select({ assignmentId: countryAssignments.id, country: wtoCountries.name, response: thirdPartyResponses.response })
    .from(thirdPartyResponses).innerJoin(countryAssignments, eq(thirdPartyResponses.countryAssignmentId, countryAssignments.id)).innerJoin(wtoCountries, eq(countryAssignments.countryId, wtoCountries.id)).where(eq(thirdPartyResponses.disputeId, disputeId));
  const [report] = await db.select().from(finalReports).where(eq(finalReports.disputeId, disputeId)).limit(1);
  const files = report ? await db.select().from(finalReportFiles).where(eq(finalReportFiles.reportId, report.id)) : [];
  const events = viewer?.role === "executive_board" ? await db.select().from(disputeAuditEvents).where(eq(disputeAuditEvents.disputeId, disputeId)).orderBy(asc(disputeAuditEvents.createdAt)) : [];
  const parties = viewer?.role === "delegate" ? allParties.filter((party) => party.assignmentId === viewerAssignmentId).map((party) => ({ ...party, statement: party.assignmentId === viewerAssignmentId ? party.statement : null })) : allParties;
  return { ...dispute, parties, responses: viewer?.role === "executive_board" ? allResponses : [], report: report && (viewer?.role === "executive_board" || dispute.status === "final_report_published") ? { ...report, files } : null, events };
}

export async function listDisputes(userId: string, role: "executive_board" | "delegate") {
  if (role === "executive_board") return db.select().from(disputes).orderBy(sql`${disputes.updatedAt} desc`);
  const assignment = await assignmentForUser(userId);
  return db.select({ id: disputes.id, disputeNumber: disputes.disputeNumber, title: disputes.title, description: disputes.description, status: disputes.status, createdBy: disputes.createdBy, createdAt: disputes.createdAt, updatedAt: disputes.updatedAt })
    .from(disputes).innerJoin(disputeParties, eq(disputes.id, disputeParties.disputeId)).where(eq(disputeParties.countryAssignmentId, assignment.id)).orderBy(sql`${disputes.updatedAt} desc`);
}

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getIssue, transitionStatus } from "@/lib/services/issue";
import { handleApiError } from "@/lib/services/errors";

const ACTION_TO_STATUS: Record<string, string> = {
  submit: "submitted",
  resubmit: "submitted",
  approve: "approved",
  reject: "rejected",
  send_to_draft: "draft",
  open_registration: "registration_open",
  close_registration: "registration_closed",
  reopen_registration: "registration_open",
  begin_submissions: "submission_phase",
  close_submissions: "submission_phase",
  begin_evidence: "evidence_phase",
  close_evidence: "evidence_phase",
  start_ai_processing: "eb_review",
  approve_report: "final_published",
  request_fact_check: "fact_checking",
  approve_fact_check: "final_revision",
  request_correction: "eb_review",
  approve_final: "final_published",
  send_to_eb: "eb_review",
  reopen: "draft",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const issue = await getIssue(issueId);
    return Response.json(issue);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    const user = await getCurrentUser(request);
    const { issueId } = await params;
    const body = await request.json();
    const targetStatus = ACTION_TO_STATUS[body.target_status] ?? body.target_status;
    const result = await transitionStatus(issueId, targetStatus, user.id, user.role);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
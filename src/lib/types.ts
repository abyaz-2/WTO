export type IssueStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "rejected"
  | "approved"
  | "published"
  | "registration_open"
  | "registration_closed"
  | "submission_phase"
  | "evidence_phase"
  | "ai_processing"
  | "eb_review"
  | "fact_checking"
  | "final_revision"
  | "final_published"
  | "archived";

export type ParticipantRole = "complainant" | "respondent" | "third_party";
export type UserRole = "executive_board" | "delegate";
export type SubmissionType = "initial_submission" | "response" | "rebuttal" | "supplemental" | "final_argument" | "other";
export type SubmissionStatus = "draft" | "submitted" | "accepted" | "revision_requested";
export type EvidenceStatus = "pending" | "validated" | "rejected";

export interface User {
  id: string;
  supabase_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  metadata?: Record<string, unknown>;
}

export interface Issue {
  id: string;
  issue_number: string;
  title: string;
  description?: string;
  complainant_id: string;
  current_status: IssueStatus;
  timeline?: TimelineEvent[];
  published_report_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  issue_id: string;
  user_id: string;
  role: ParticipantRole;
  status: string;
  joined_at: string;
  metadata?: Record<string, unknown>;
  user?: User;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  actor_name: string;
  created_at: string;
}

export interface Submission {
  id: string;
  issue_id: string;
  participant_id: string;
  submission_type: SubmissionType;
  content?: Record<string, unknown> & { version?: number; text?: string };
  status: SubmissionStatus;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  participant?: Participant;
}

export interface Evidence {
  id: string;
  issue_id: string;
  participant_id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description?: string;
  storage_path: string;
  status: EvidenceStatus;
  created_at: string;
  updated_at: string;
  participant?: Participant;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type PipelineStage =
  | "collect"
  | "normalize"
  | "extract_facts"
  | "retrieve_law"
  | "analyze_claims"
  | "draft_intro"
  | "draft_factual"
  | "draft_analysis"
  | "draft_findings"
  | "draft_recommendations";

export type PipelineStatus = "pending" | "running" | "completed" | "failed" | "retrying";

export interface ReportSection {
  id: string;
  type: "introduction" | "factual_aspects" | "parties_requests" | "legal_analysis" | "findings" | "recommendations";
  title: string;
  content: string;
  confidence: number;
  citations: Array<{ id: string; source: string; url?: string; type: string }>;
  editable: boolean;
  word_count: number;
}

export interface ReportVersion {
  id: string;
  issue_id: string;
  version: number;
  status: string;
  sections: ReportSection[];
  confidence: { overall: number; dimensions: Record<string, number>; per_section: Array<{ section_title: string; score: number }> };
  executive_summary: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type CorrectionStatus = "pending" | "accepted" | "rejected";

export interface CorrectionRequest {
  id: string;
  report_id: string;
  section_id: string;
  paragraph_index: number;
  original_text: string;
  proposed_text: string;
  justification: string;
  submitted_by: string;
  party: "complainant" | "respondent" | "third_party";
  status: CorrectionStatus;
  eb_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Revision {
  id: string;
  revision_number: number;
  original_text: string;
  revised_text: string;
  party: string;
  section_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export interface ApiError {
  detail: string;
  status: number;
}

export interface Notification {
  id: string;
  type: "correction" | "revision" | "publication" | "status" | "mention";
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: string;
}

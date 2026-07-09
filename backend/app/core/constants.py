from __future__ import annotations

import enum


class IssueStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    REJECTED = "rejected"
    APPROVED = "approved"
    PUBLISHED = "published"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    SUBMISSION_PHASE = "submission_phase"
    EVIDENCE_PHASE = "evidence_phase"
    AI_PROCESSING = "ai_processing"
    EB_REVIEW = "eb_review"
    FACT_CHECKING = "fact_checking"
    FINAL_REVISION = "final_revision"
    FINAL_PUBLISHED = "final_published"
    ARCHIVED = "archived"


class ParticipantRole(str, enum.Enum):
    COMPLAINANT = "complainant"
    RESPONDENT = "respondent"
    THIRD_PARTY = "third_party"


class ParticipantStatus(str, enum.Enum):
    ACTIVE = "active"
    REMOVED = "removed"
    REPLACED = "replaced"


class SubmissionType(str, enum.Enum):
    INITIAL_SUBMISSION = "initial_submission"
    RESPONSE = "response"
    REBUTTAL = "rebuttal"
    SUPPLEMENTAL = "supplemental"
    FINAL_ARGUMENT = "final_argument"
    OTHER = "other"


class SubmissionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REVISION_REQUESTED = "revision_requested"


class EvidenceStatus(str, enum.Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"


class AIReportStatus(str, enum.Enum):
    GENERATING = "generating"
    DRAFT = "draft"
    EB_REVIEW = "eb_review"
    FACT_CHECKING = "fact_checking"
    FINALIZING = "finalizing"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class FactCheckStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    CORRECTION_REQUESTED = "correction_requested"


class NotificationType(str, enum.Enum):
    ISSUE_CREATED = "issue_created"
    ISSUE_TRANSITIONED = "issue_transitioned"
    SUBMISSION_RECEIVED = "submission_received"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    REPORT_READY = "report_ready"
    FACT_CHECK_REQUESTED = "fact_check_requested"
    CORRECTION_REQUESTED = "correction_requested"
    PARTICIPANT_ADDED = "participant_added"
    PARTICIPANT_REMOVED = "participant_removed"
    DEADLINE_REMINDER = "deadline_reminder"
    SYSTEM_NOTIFICATION = "system_notification"


class RevisionType(str, enum.Enum):
    SUBMISSION = "submission"
    EVIDENCE = "evidence"
    AI_REPORT = "ai_report"
    FACT_CHECK = "fact_check"
    ISSUE = "issue"


class UserRole(str, enum.Enum):
    EXECUTIVE_BOARD = "executive_board"
    DELEGATE = "delegate"

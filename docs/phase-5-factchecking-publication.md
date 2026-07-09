# Phase 5: Fact-checking, Revision, Publication, and Archive

## 1. Overview

Phase 5 completes the WTO Digital Dispute Documentation Platform by implementing the post-AI-report workflow. After the Expert Body (EB) completes its review and editing of the AI-generated panel report (Phase 4), the report enters the **fact-checking and review cycle** involving the dispute parties. Each party — Complainant, Respondent, and Third Parties — can review the report, request corrections, and provide comments. The EB adjudicates correction requests, publishes the final report, and the system supports archiving of completed disputes with full notification infrastructure.

The system is built on **Next.js 16.2.9**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **React Hook Form**, **TanStack Query**, **Supabase**, and **Framer Motion**.

### 1.1 Design Context

All UI components follow the institutional WTO aesthetic:
- **Background**: `bg-primary #05162D`, `bg-secondary #0B2345`, `bg-elevated #112F5A`
- **Accent**: `accent-primary #1E6FE8`
- **Typography**: Sora (all headings and body)
- **Spacing**: xs 8px, sm 16px, md 24px, lg 40px
- **Radius**: sm 8px, md 12px
- **Dark theme** with wireframe globe motifs, trade route arcs, and connection paths
- **Framer Motion** with `prefers-reduced-motion` support

---

## 2. Post-EB Review Workflow

### 2.1 Workflow State Machine

```typescript
enum ReportLifecycleState {
  AI_DRAFT = 'ai_draft',
  EB_REVIEW = 'eb_review',
  EB_APPROVED = 'eb_approved',
  PARTY_REVIEW = 'party_review',
  CORRECTIONS_PENDING = 'corrections_pending',
  EB_CORRECTION_REVIEW = 'eb_correction_review',
  FINALIZING = 'finalizing',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
```

**State Transitions**:

```
AI_DRAFT → EB_REVIEW (EB begins review)
EB_REVIEW → EB_APPROVED (EB chair signs off)
EB_APPROVED → PARTY_REVIEW (sent to parties)
PARTY_REVIEW → CORRECTIONS_PENDING (a party requests correction)
PARTY_REVIEW → FINALIZING (all parties approve)
CORRECTIONS_PENDING → EB_CORRECTION_REVIEW (EB notified)
EB_CORRECTION_REVIEW → EB_REVIEW (EB accepts + edits report)
EB_CORRECTION_REVIEW → FINALIZING (EB rejects correction)
FINALIZING → PUBLISHED (EB publishes)
PUBLISHED → ARCHIVED (after 90 days or on request)
```

### 2.2 Sending Report to Parties

When the EB approves the report for party review, the system:

1. Marks the report status as `eb_approved`
2. Creates a **review assignment** for each party:

```sql
CREATE TABLE party_review_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES ai_reports(id),
  dispute_id      UUID NOT NULL REFERENCES disputes(id),
  party_id        UUID NOT NULL REFERENCES dispute_parties(user_id),
  party_type      TEXT NOT NULL CHECK (party_type IN ('complainant', 'respondent', 'third_party')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'correction_requested', 'commented')),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline        TIMESTAMPTZ NOT NULL,       -- 30 days from assignment
  completed_at    TIMESTAMPTZ,
  UNIQUE(report_id, party_id)
);
```

3. Sends notifications (see Section 7)
4. The party dashboard shows the report as "Awaiting Your Review" with a countdown to the deadline

### 2.3 Party Review Interface

Each party accesses the report via `/disputes/{id}/reports/{reportId}/review`:

```
┌─────────────────────────────────────────────────────────┐
│ DS-612: United States — Certain Measures on Steel       │
│ Report v2 · Review as: Complainant                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Submit Approval] [Request Correction ▾] [Add Comment]  │
│                                                         │
│ ╔══════════════════════════════════════════════════════╗ │
│ ║  1. Introduction                                    ║ │
│ ║  ─────────────────────────────────────────────       ║ │
│ ║  [Select text to comment or request correction]     ║ │
│ ║                                                     ║ │
│ ║  1.1 Panel Establishment                            ║ │
│ ║  The Panel was established by the DSB on...         ║ │
│ ║                                                     ║ │
│ ║  ┌─ Comment ─────────────────────────────────────┐  ║ │
│ ║  │ Party member: The date of establishment should │  ║ │
│ ║  │ be 12 January 2026, not 13 January.            │  ║ │
│ ║  │ Type: Correction Request  [Submit] [Cancel]    │  ║ │
│ ║  └────────────────────────────────────────────────┘  ║ │
│ ╚══════════════════════════════════════════════════════╝ │
│                                                         │
│ Your Status: Reviewing (3 of 30 days remaining)         │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Parties can select text in any report section and either:
  - **Add Comment**: Non-binding observation (no action required)
  - **Request Correction**: Formal request for the EB to change the text
- Each correction request requires a justification
- Parties can see their own pending correction requests highlighted in amber
- After reviewing, the party clicks "Submit Approval" which changes their status to `approved`
- The review is not complete until all parties have either `approved` or `correction_requested`

---

## 3. Correction Requests and Revisions

### 3.1 Correction Request Lifecycle

```typescript
interface CorrectionRequest {
  id: UUID;
  report_id: UUID;
  section_id: string;
  paragraph_index: number;
  selected_text: string;           // The text the party wants changed
  proposed_revision: string;       // What the party proposes instead
  justification: string;
  submitted_by: UUID;
  party_type: 'complainant' | 'respondent' | 'third_party';
  status: 'pending' | 'accepted' | 'rejected';
  eb_notes: string | null;        // EB's decision rationale
  created_at: Timestamp;
  resolved_at: Timestamp | null;
}
```

Each correction request is stored immutably and creates a **revision entry**:

### 3.2 Revision Numbering System

Revisions follow the scheme: `{entity_type}/{entity_id}/v{version}`

```sql
CREATE TABLE report_revisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES ai_reports(id),
  revision_number   TEXT NOT NULL,           -- e.g. "complainant/a1b2c3d4/v1"
  correction_request_id UUID REFERENCES correction_requests(id),
  section_id        TEXT NOT NULL,
  original_text     TEXT NOT NULL,
  revised_text      TEXT NOT NULL,
  revision_type     TEXT NOT NULL CHECK (revision_type IN ('correction', 'eb_edit', 'publication_cleanup')),
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, revision_number)
);
```

**Revision numbering examples**:
- First correction from Complainant: `complainant/{userId}/v1`
- Second correction from same Complainant: `complainant/{userId}/v2`
- EB edit in response to correction: `eb/{ebUserId}/v1`
- EB direct edit (not from a correction): `eb/{ebUserId}/v1`

The numbering is **per-actor**, not global. This ensures that each party can trace their own revision history independently.

### 3.3 Revision Browser with Diff View

The revision browser is accessible at `/disputes/{id}/reports/{reportId}/revisions`:

```
┌──────────────────────────────────────────────────────────────┐
│ Revision Browser · DS-612 · Report v2                       │
├──────────────────────────────────────────────────────────────┤
│ Filters: [All] [Correction Requests] [EB Edits] [By Party ▾]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ Revision ───────────────────────────────────────────────┐ │
│ │ complainant/AcmeCorp/v1                                 │ │
│ │ Section 1.1 · 12 Jan 2026 · Status: Pending             │ │
│ │                                                          │ │
│ │  ┌─ Original ───────────────────┐ ┌─ Proposed ────────┐ │ │
│ │  │ The Panel was established    │ │ The Panel was      │ │ │
│ │  │ by the DSB on 13 January     │ │ established by the │ │ │
│ │  │ 2026.                        │ │ DSB on 12 January  │ │ │
│ │  │                              │ │ 2026.              │ │ │
│ │  └──────────────────────────────┘ └────────────────────┘ │ │
│ │                                                          │ │
│ │  Justification: "The DSB meeting was 12 Jan, not 13."   │ │
│ │  EB Response: [Accept] [Reject] [Add Note]              │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ Revision ───────────────────────────────────────────────┐ │
│ │ eb/eb-chair-001/v1                                       │ │
│ │ Section 3.2 · 12 Jan 2026 · Status: Accepted            │ │
│ │                                                          │ │
│ │  Applied change: "subsidy" → "subsidy measure"           │ │
│ │  Reason: Clarification per Respondent's request (R/v1)   │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Diff View** (inline):

When viewing a specific revision inline in the report, changes are highlighted:

```
The Panel finds that the measure constitutes a...
┌─────────────────────────────────────────────┐
│ ⟵ 1. subsidy on steel products              │
│ ⟶ 2. subsidy measure applicable to steel    │
│    products                                 │
└─────────────────────────────────────────────┘
...within the meaning of Article 3 of the SCM Agreement.
```

- Removed text: red background with strikethrough
- Added text: green background
- Changed text: amber background (shows both)
- Side-by-side mode available for complex changes

### 3.4 EB Review of Correction Requests

When correction requests are submitted, the EB receives notifications. The EB reviews them in the **Corrections Dashboard**:

```
┌─────────────────────────────────────────────────────────────┐
│ Correction Requests · DS-612                               │
├─────────────────────────────────────────────────────────────┤
│ 3 Pending · 2 Accepted · 1 Rejected                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║ Request #1 · Complainant · Section 1.1                 ║ │
│ ║ "13 January" → "12 January"                             ║ │
│ ║ Verdict: ⚠️ Need to verify DSB calendar                 ║ │
│ ║ [Accept & Apply] [Reject] [Add Internal Note]           ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
│                                                             │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║ Request #2 · Respondent · Section 3.2                   ║ │
│ ║ "subsidy" → "subsidy measure"                            ║ │
│ ║ Verdict: ✅ Reasonable clarification                     ║ │
│ ║ [Accept & Apply] [Reject] [Add Internal Note]           ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
│                                                             │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║ Request #3 · Third Party · Section 5.1                  ║ │
│ ║ "significant" → "substantial"                            ║ │
│ ║ Verdict: ❌ "Significant" is the correct legal term      ║ │
│ ║ [Accept & Apply] [Reject] [Add Internal Note]           ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

**EB Actions**:
1. **Accept & Apply**: The proposed revision is applied to the report, a new revision record is created (`eb/{ebUserId}/v{n}`), the correction request status is set to `accepted`, and the party is notified
2. **Reject**: The correction request is marked `rejected` with an EB note explaining why, the party is notified
3. **Add Internal Note**: Private note visible only to EB and secretariat

**Rules**:
- The EB may partially accept a correction (e.g., accept the factual correction but rephrase the proposed text differently)
- The EB may also make independent edits not in response to any correction request (these create `eb_edit` type revisions)
- Each accepted or independently-made edit creates a **new report version** (`ai_reports.version` increments)
- Parties can see the updated report after each EB action

---

## 4. Final Publication

### 4.1 Publication Workflow

When all correction requests are resolved and the EB is satisfied:

1. **EB Chair** clicks "Publish Final Report"
2. System validates:
   - All `correction_requests` are either `accepted` or `rejected`
   - No pending edits in `report_edit_sessions`
3. Report status transitions to `finalizing`
4. A **final cleanup pass** runs:
   - Strips internal EB notes and comments from the report
   - Converts markdown to final formatted PDF using `@react-pdf/renderer`
   - Applies the WTO document template (header, footer, document number)
   - Generates a cover page with dispute title, panel members, date
5. Report status transitions to `published`
6. The published report is stored in Supabase Storage `reports` bucket:
   ```
   reports/{dispute_id}/v{version}/report.pdf
   reports/{dispute_id}/v{version}/report.html
   reports/{dispute_id}/v{version}/metadata.json
   ```
7. Both PDF and HTML versions are generated for accessibility
8. All parties receive publication notifications

### 4.2 Published Report View

Published reports are accessible at `/disputes/{id}/reports/{reportId}/published`:

```
┌──────────────────────────────────────────────────────────────┐
│ WTO Panel Report · DS-612                                   │
│ United States — Certain Measures on Steel Products          │
│ Published: 15 March 2026                                    │
│                                                             │
│ [Download PDF] [Download HTML] [Print]                      │
│                                                             │
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ WORLD TRADE ORGANIZATION                                 ║ │
│ ║ Panel Report                                             ║ │
│ ║ DS-612: United States — Certain Measures on Steel        ║ │
│ ║ Products                                                 ║ │
│ ║                                                          ║ │
│ ║ Adopted by the Dispute Settlement Body on 15 March 2026  ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│                                                              │
│ Table of Contents                                           │
│ 1. Introduction ........................................ 3   │
│ 2. Factual Aspects ..................................... 8   │
│ 3. Parties' Requests ................................... 14  │
│ 4. Legal Analysis ...................................... 18  │
│ 5. Findings ........................................... 42  │
│ 6. Recommendations .................................... 48  │
│                                                              │
│ [View Full Report]                                           │
└──────────────────────────────────────────────────────────────┘
```

**Published reports are strictly read-only**:
- No edit buttons
- No comment forms
- No correction request interface
- The report HTML is rendered as static content
- PDF download is provided for official records
- Each view is tracked for analytics (who viewed, when)

### 4.3 Read-Only Enforcement

```sql
-- Published reports are read-only at the application layer
-- Any write attempt returns 403 Forbidden

-- Supabase RLS policy for published reports
CREATE POLICY published_reports_readonly ON ai_reports
  FOR UPDATE
  USING (status != 'published' AND status != 'archived')
  WITH CHECK (status != 'published' AND status != 'archived');

-- Storage bucket 'reports' is configured with:
-- - public: true (readable by anyone)
-- - RLS: Objects can only be deleted/updated by secretariat role
```

### 4.4 Publication Certificate

Upon publication, a **certificate page** is generated containing:
- Dispute number and title
- Date of publication
- Panel members
- Digital signature hash (SHA-256 of the report PDF)
- QR code linking to the official publication URL
- WTO emblem

This certificate is included as the final page of the published PDF and is also available as a standalone download.

---

## 5. Archive System

### 5.1 Archive Lifecycle

After a dispute is resolved and the report has been published for 90 days (or earlier if all parties and EB agree), the dispute enters the archive:

1. `disputes.status` → `archived`
2. `ai_reports.status` → `archived` (for all report versions)
3. Related submissions, evidence, and annotations are preserved but marked as archived
4. Active storage (submission drafts, edit sessions) is cleaned up:
   - Delete `report_edit_sessions` older than 7 days after archive
   - Keep `submission_versions` and `evidence` (for historical record)
5. An **archive manifest** is generated listing all records associated with the dispute

### 5.2 Archive Access

Archived disputes are accessible via `/disputes/archive`:

```
┌──────────────────────────────────────────────────────────────┐
│ Archived Disputes                                            │
├──────────────────────────────────────────────────────────────┤
│ Search archived disputes...                              🔍  │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ DS-612 · US — Steel Products           Archived Mar 2026 │ │
│ │ Complainant: India    Respondent: USA                    │ │
│ │ Published: 15 Mar 2026   View Report →                  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ DS-589 · EU — Dairy Subsidies          Archived Jan 2026 │ │
│ │ Complainant: Brazil    Respondent: EU                    │ │
│ │ Published: 12 Jan 2026   View Report →                  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ DS-534 · China — Rare Earth Exports    Archived Sep 2025 │ │
│ │ Complainant: USA    Respondent: China                    │ │
│ │ Published: 1 Sep 2025   View Report →                   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Showing 1-3 of 12 archived disputes    [Load More]           │
└──────────────────────────────────────────────────────────────┘
```

**Archive access rules**:
- Public: Can view archived reports (read-only, published versions only)
- Parties: Can view all archived materials including their own submissions and evidence
- EB/Secretariat: Full access to everything including internal notes

### 5.3 Archive Data Retention Policy

| Data Type | Retention | Cleanup |
|-----------|-----------|---------|
| Published reports | Permanent | Never deleted |
| Submission versions | Permanent | Never deleted |
| Evidence files | Permanent | Never deleted |
| Correction requests | Permanent | Never deleted |
| Report edit sessions | 7 days after archive | Deleted |
| Pipeline runs | Permanent | Never deleted |
| LLM cache | 90 days after archive | Deleted |
| Draft submissions | Archived with status | Preserved as-is |

---

## 6. Notification System

### 6.1 Architecture

The notification system uses an **in-app notification center** with **email placeholders** for future integration.

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL CHECK (type IN (
    'correction_requested', 'correction_accepted', 'correction_rejected',
    'report_ready_for_review', 'report_published', 'report_archived',
    'deadline_reminder', 'eb_action_required', 'comment_added',
    'status_change', 'system_notification'
  )),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  link            TEXT,                      -- Deep link to relevant page
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent      BOOLEAN NOT NULL DEFAULT FALSE,  -- Placeholder for email integration
  email_placeholder TEXT,                    -- {"to": "user@example.com", "template": "correction_accepted"}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
```

### 6.2 Notification Types and Triggers

| Notification Type | Trigger | Recipients |
|------------------|---------|------------|
| `report_ready_for_review` | EB approves report for party review | All parties |
| `correction_requested` | Party submits correction request | EB members, Secretariat |
| `correction_accepted` | EB accepts correction | Requesting party |
| `correction_rejected` | EB rejects correction | Requesting party |
| `report_published` | Final report published | All parties, EB, Secretariat |
| `comment_added` | Party adds comment | EB members |
| `deadline_reminder` | 7, 3, and 1 day before review deadline | Party with pending review |
| `eb_action_required` | All parties reviewed, EB needs to finalize | EB Chair |
| `report_archived` | Dispute archived | All parties, EB, Secretariat |
| `status_change` | Any status transition | All involved users |

### 6.3 In-App Notification Center

```
┌──────────────────────────────────────────────┐
│ 🔔 Notifications                    [Mark All]│
├──────────────────────────────────────────────┤
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ ● Correction Accepted                    │ │
│ │   Your correction to Section 3.2 has     │ │
│ │   been accepted by the EB.               │ │
│ │   5 minutes ago · [View Revision]        │ │
│ ├──────────────────────────────────────────┤ │
│ │ ● Report Ready for Review                │ │
│ │   The Panel Report for DS-612 is ready   │ │
│ │   for your review. Deadline: 14 Feb.     │ │
│ │   1 hour ago · [Review Report]           │ │
│ ├──────────────────────────────────────────┤ │
│ │ ○ Correction Requested                   │ │
│ │   Respondent has requested a correction  │ │
│ │   in Section 5.1.                        │ │
│ │   3 hours ago · [View Request]           │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [View All Notifications →]                   │
└──────────────────────────────────────────────┘
```

- Unread notifications have a blue dot (●)
- Click navigates to the relevant page via the `link` field
- "Mark All" marks all notifications as read for the current user
- Notification bell icon in the navigation header shows unread count

### 6.4 Email Notification Placeholders

Email integration is prepared but not implemented in Phase 5. The `email_placeholder` column stores the email payload that would be sent:

```typescript
// Email placeholder structure stored in notification record
interface EmailPlaceholder {
  to: string[];                     // Recipient email addresses
  template: string;                 // Email template identifier
  variables: Record<string, string>; // Template variables
  attachments?: string[];           // Links to report PDFs
}

// Example: When a report is published
const emailPlaceholder: EmailPlaceholder = {
  to: ["party-rep@example.com"],
  template: "report_published",
  variables: {
    dispute_title: "DS-612: US — Steel Products",
    report_url: "https://platform.wto.org/disputes/DS-612/reports/v2/published",
    publication_date: "15 March 2026",
  },
  attachments: ["https://storage.supabase.co/reports/DS-612/v2/report.pdf"],
};
```

The email sending function is a placeholder that logs to the database but does not actually send:

```typescript
async function sendNotificationEmails(notificationId: UUID): Promise<void> {
  const notification = await getNotification(notificationId);
  if (!notification.email_placeholder) return;

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // const emailService = new EmailService();
  // await emailService.send(notification.email_placeholder);

  // Placeholder: log to email_queue table for future processing
  await supabase.from('email_queue').insert({
    notification_id: notificationId,
    placeholder: notification.email_placeholder,
    status: 'pending',
    created_at: new Date(),
  });

  // Mark as sent to avoid re-queueing
  await supabase.from('notifications')
    .update({ email_sent: true })
    .eq('id', notificationId);
}
```

---

## 7. Timeline View

### 7.1 Full Lifecycle Timeline

The timeline view at `/disputes/{id}/timeline` shows the entire dispute lifecycle from filing through publication and archive:

```
┌──────────────────────────────────────────────────────────────┐
│ DS-612 Dispute Timeline                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  10 Jan 2026 ─── Dispute Filed by India                      │
│                    ●── ●── ●── ●── ●── ●── ●── ●── ●        │
│                    │                                        │
│  15 Jan 2026 ─── ● Complainant Submission v1 Submitted      │
│                    │                                        │
│  22 Jan 2026 ─── ● Respondent Submission v1 Submitted       │
│                    │                                        │
│  05 Feb 2026 ─── ● Third Party Submissions (3) Submitted    │
│                    │                                        │
│  10 Feb 2026 ─── ● AI Report Pipeline Started               │
│                    │  ├─ Collect      ✅                     │
│                    │  ├─ Normalize    ✅                     │
│                    │  ├─ Extract Facts ✅                     │
│                    │  ├─ Retrieve WTO Law ✅                  │
│                    │  ├─ Compare       ✅                     │
│                    │  ├─ Contradictions ✅                    │
│                    │  ├─ Identify Gaps ✅                     │
│                    │  ├─ Generate Report ✅                   │
│                    │  ├─ Citations     ✅                     │
│                    │  └─ Confidence    ✅                     │
│                    │                                        │
│  11 Feb 2026 ─── ● AI Draft Report v1 Ready                 │
│                    │                                        │
│  12 Feb 2026 ─── ● EB Review Started                        │
│                    │  ├─ EB Member A: Reviewed Section 1-3   │
│                    │  ├─ EB Member B: Reviewed Section 4-6   │
│                    │  └─ EB Approved for Party Review        │
│                    │                                        │
│  15 Feb 2026 ─── ● Party Review Started                     │
│                    │  ├─ Complainant: Correction Requested   │
│                    │  ├─ Respondent: Approved                │
│                    │  └─ Third Parties: Approved             │
│                    │                                        │
│  18 Feb 2026 ─── ● Correction Resolution                    │
│                    │  ├─ Complainant Request #1: Accepted    │
│                    │  └─ EB Edit Applied → Report v2        │
│                    │                                        │
│  20 Feb 2026 ─── ● Parties Re-reviewed & Approved           │
│                    │                                        │
│  25 Feb 2026 ─── ● Report Published                         │
│                    │                                        │
│  25 May 2026 ─── ● Dispute Archived                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Timeline Implementation**:

```typescript
interface TimelineEvent {
  id: UUID;
  dispute_id: UUID;
  event_type: string;           // 'dispute_filed' | 'submission' | 'pipeline_run' | 'review' | 'correction' | 'publication' | 'archive'
  title: string;
  description: string;
  date: Timestamp;
  actor: string;                // User name
  icon: string;                 // Icon identifier for visual display
  metadata: Record<string, any>; // Links to specific records
  child_events?: TimelineEvent[]; // For expandable details (e.g., pipeline steps)
}
```

**Visual Design**:
- Vertical timeline with nodes on the left
- Primary events are large nodes with the date
- Sub-events are smaller indented nodes
- Interactive: click on any event to see details or navigate to the relevant page
- Color coding: blue for submissions, amber for AI pipeline, green for approvals, purple for publication
- Animated with Framer Motion (entry animation on scroll, disabled with `prefers-reduced-motion`)

---

## 8. Data Schema Summary

```sql
-- Party review assignments
CREATE TABLE party_review_assignments (...);  -- Section 2.2

-- Correction requests
CREATE TABLE correction_requests (...);        -- Section 3.1

-- Report revisions
CREATE TABLE report_revisions (...);           -- Section 3.2

-- Notifications
CREATE TABLE notifications (...);              -- Section 6.1

-- Email queue (placeholder)
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  placeholder JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Timeline events
CREATE TABLE timeline_events (...);            -- Section 7.1
```

---

## 9. API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/disputes/{id}/reports/{rid}/review` | Get review interface data |
| POST   | `/api/disputes/{id}/reports/{rid}/review/approve` | Party approves report |
| POST   | `/api/disputes/{id}/reports/{rid}/corrections` | Submit correction request |
| GET    | `/api/disputes/{id}/reports/{rid}/corrections` | List correction requests |
| PATCH  | `/api/disputes/{id}/reports/{rid}/corrections/{cid}` | EB action on correction |
| GET    | `/api/disputes/{id}/reports/{rid}/revisions` | List revisions |
| GET    | `/api/disputes/{id}/reports/{rid}/revisions/{revId}/diff` | Get diff for revision |
| POST   | `/api/disputes/{id}/reports/{rid}/publish` | Publish final report |
| POST   | `/api/disputes/{id}/archive` | Archive dispute |
| GET    | `/api/disputes/archive` | List archived disputes |
| GET    | `/api/notifications` | List user's notifications |
| PATCH  | `/api/notifications/{id}/read` | Mark notification as read |
| POST   | `/api/notifications/mark-all-read` | Mark all as read |
| GET    | `/api/disputes/{id}/timeline` | Get timeline data |

---

## 10. Framer Motion Animations

### 10.1 Animation Specifications

All animations respect the user's `prefers-reduced-motion` setting:

```typescript
import { useReducedMotion } from 'framer-motion';

function AnimatedSection({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**Animation Inventory**:

| Element | Animation | Duration | Trigger |
|---------|-----------|----------|---------|
| Page transitions | Fade + slide up | 300ms | Route change |
| Notifications | Slide from right | 400ms | New notification |
| Timeline nodes | Staggered fade in | 500ms | Scroll into view |
| Revision diff | Highlight flash | 1s (then fade) | Load diff |
| Status changes | Scale pulse | 300ms | Status transition |
| Modal overlays | Fade + scale | 200ms | Open/close |
| Stepper progress | Width tween | 500ms | Pipeline progress |
| Upload progress | Linear progress | Real-time | Upload bytes |

### 10.2 Route Transition

```typescript
// app/layout.tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

---

## 11. Error Handling

### 11.1 Correction Request Errors
- **Concurrent Correction Submission**: If two party members submit corrections on the same paragraph simultaneously, both are accepted but the EB sees them as separate requests
- **Stale Report View**: When a party is reviewing and the EB publishes an updated version, a banner warns: "The report has been updated. Click to reload."

### 11.2 Publication Errors
- **PDF Generation Failure**: Falls back to HTML-only publication, PDF is marked as "generating" and retried via background job
- **Storage Upload Failure**: Saves report content to database and retries storage upload every 5 minutes

### 11.3 Notification Errors
- If notification creation fails, the action (e.g., correction acceptance) is unaffected — notifications are fire-and-forget
- A `notification_errors` table logs failures for admin review

---

## 12. Testing Strategy

- **Unit tests**: Revision numbering logic, notification type determination, timeline event generation, archive cleanup queries
- **Integration tests**: Full party review flow (approve, request correction, comment), EB correction review, publication pipeline
- **E2E tests**: Playwright tests for complete lifecycle — EB approves → party reviews → correction requested → EB accepts → report published → dispute archived
- **Notification tests**: Verify correct notifications are created for each trigger action
- **Diff tests**: Verify diff output is accurate for known input pairs

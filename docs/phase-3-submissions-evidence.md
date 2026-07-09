# Phase 3: Written Submissions & Evidence Management

## 1. Overview

Phase 3 introduces the structured written submissions system and evidence management infrastructure for the WTO Digital Dispute Documentation Platform. This phase enables parties to a dispute to file structured legal arguments, upload supporting evidence, and for panelists and secretariat staff to review, search, and version all submitted materials.

The system is built on **Next.js 16.2.9**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **React Hook Form**, **TanStack Query**, **Supabase Storage**, and **Postgres Full Text Search (FTS)**.

### 1.1 Design Context

All UI components in this phase follow the institutional WTO aesthetic:
- **Background**: `bg-primary #05162D`, `bg-secondary #0B2345`, `bg-elevated #112F5A`
- **Accent**: `accent-primary #1E6FE8`
- **Typography**: Sora (all headings and body text)
- **Spacing**: xs 8px, sm 16px, md 24px, lg 40px
- **Radius**: sm 8px, md 12px
- **Dark theme** throughout, with wireframe globe motifs, trade route arcs, and connection paths as visual ornaments
- **Framer Motion** for transitions, with `prefers-reduced-motion` respected

---

## 2. Written Submissions

Every dispute proceeding in the WTO framework accommodates three participant types: Complainant, Respondent, and Third Parties. Each participant type files a structurally distinct submission.

### 2.1 Submission Lifecycle

1. **Draft** — Participant is composing the submission (auto-saved every 30 seconds)
2. **Submitted** — Participant formally files the submission (immutable after 15-minute grace window)
3. **Acknowledged** — Secretariat confirms receipt
4. **Under Review** — Panel is actively reviewing
5. **Responded** — Counter-party has replied (where applicable)

Status transitions are tracked in the `submission_status_log` table with timestamps and actor IDs.

### 2.2 Data Schema

#### 2.2.1 Submissions Table

```sql
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id      UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('complainant', 'respondent', 'third_party')),
  entity_id       UUID NOT NULL REFERENCES dispute_parties(user_id),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged','under_review','responded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  content         JSONB NOT NULL,
  search_vector   TSVECTOR
);
```

The `content` column is a JSONB blob whose structure varies by `entity_type`.

#### 2.2.2 Complainant Submission Structure

```typescript
interface ComplainantSubmission {
  issue_description: {
    summary: string;                    // 500-word max summary of the grievance
    factual_background: string;         // Detailed chronology of events
    trade_agreements_invoked: string[]; // e.g. ["GATT 1994 Art. I", "GATT 1994 Art. III"]
    products_sectors_affected: string[]; // e.g. ["steel", "agricultural_dairy"]
  };
  legal_basis: {
    claims: Array<{
      agreement: string;                // WTO agreement article
      violation_type: string;           // e.g. "discriminatory_treatment"
      reasoning: string;                // Legal reasoning for the claim
    }>;
    precedent_cases: string[];          // WTO panel/appellate cases cited
  };
  requested_remedy: {
    primary_remedy: string;             // e.g. "Withdrawal of measure"
    compensation_requested: string | null;
    suspension_of_concessions: string | null;
    implementation_period: string;      // Suggested time frame
  };
  supporting_evidence: Array<{
    evidence_id: UUID;                  // References evidence table
    description: string;
    relevance_statement: string;
  }>;
}
```

#### 2.2.3 Respondent Submission Structure

```typescript
interface RespondentSubmission {
  defense: {
    preliminary_objections: Array<{
      grounds: string;
      legal_basis: string;
    }>;
    factual_rebuttal: string;           // Response to factual claims
    justification: string;              // e.g. General Exceptions under Art. XX
  };
  legal_arguments: Array<{
    agreement: string;
    counter_interpretation: string;     // Alternative legal interpretation
    supporting_cases: string[];
  }>;
  evidence: Array<{
    evidence_id: UUID;
    description: string;
    counter_evidence_for?: string;      // Links to which complainant evidence this rebuts
  }>;
  requested_outcome: {
    primary_request: string;            // e.g. "Dismissal of claims"
    alternative_requests: string[];
    conditions: string[];               // Conditions under which settlement acceptable
  };
}
```

#### 2.2.4 Third Party Submission Structure

```typescript
interface ThirdPartySubmission {
  trade_interest: {
    description: string;                // Description of systemic/commercial interest
    affected_trade_volume?: {
      value: number;
      currency: string;
      period: string;
    };
    systemic_interest: string;          // Interest in interpretation of agreement
  };
  position: {
    supports: 'complainant' | 'respondent' | 'neither';
    reasoning: string;
    specific_claims_supported: string[]; // Which claims they align with
  };
  supporting_arguments: Array<{
    agreement: string;
    interpretation: string;
    legal_reasoning: string;
  }>;
  evidence: Array<{
    evidence_id: UUID;
    description: string;
  }>;
}
```

### 2.3 Submission Form Implementation

Each form is implemented as a multi-step wizard using **React Hook Form** with Zod schema validation.

#### 2.3.1 Form Steps (Complainant Example)

1. **Step 1: Issue Description**
   - Fields: summary (textarea, max 500 words), factual_background (rich text editor), trade_agreements_invoked (multi-select combobox), products_sectors_affected (tag input)
   - Validation: all required, summary word count enforced

2. **Step 2: Legal Basis**
   - Dynamic array of claims using `useFieldArray`
   - Each claim: agreement (searchable dropdown), violation_type (predefined list), reasoning (rich text)
   - Precedent cases: tag input with autocomplete from WTO case database

3. **Step 3: Requested Remedy**
   - Primary remedy (dropdown), compensation (conditional textarea), suspension (conditional), implementation period (date/month picker)

4. **Step 4: Supporting Evidence**
   - Drag-and-drop file upload (see Section 3)
   - After upload completes, each file gets a description and relevance statement
   - Re-ordering of evidence items

5. **Step 5: Review & Submit**
   - Read-only preview of entire submission
   - Accept terms checkbox
   - Submit button triggers `POST /api/disputes/[id]/submissions`

#### 2.3.2 Auto-save

Every 30 seconds, the current form state (excluding file uploads) is persisted to the `submissions` table with `status = 'draft'`. Drafts are visible only to the author and secretariat staff.

```typescript
// tanstack-query mutation with debounce
const autoSaveMutation = useMutation({
  mutationFn: (data: Partial<ComplainantSubmission>) =>
    api.patch(`/api/disputes/${disputeId}/submissions/${submissionId}`, { content: data }),
  onError: (err) => toast.error("Auto-save failed", { description: err.message }),
});
```

### 2.4 Submission Versioning

Every time a submission is **submitted** (transitioning from `draft` to `submitted`), a new version is created. The version number increments from the previous maximum version for that `(dispute_id, entity_type, entity_id)` tuple.

- **Drafts do not create versions** — only formal submissions create versioned records.
- The `submissions` table stores only the latest draft state.
- A separate `submission_versions` table stores immutable copies:

```sql
CREATE TABLE submission_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES submissions(id),
  version         INTEGER NOT NULL,
  content         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES users(id),
  UNIQUE(submission_id, version)
);
```

When a party views a past submission, they retrieve from `submission_versions` using the path `/disputes/{disputeId}/submissions/{entity_type}/{entity_id}/v{version}`.

---

## 3. Evidence Management

### 3.1 Supabase Storage Integration

Evidence files are stored in **Supabase Storage** using two buckets:

| Bucket     | Purpose                              | Visibility        |
|------------|--------------------------------------|-------------------|
| `evidence` | Submitted evidence for disputes      | Authenticated only|
| `reports`  | Generated panel reports (Phase 4-5)  | Public (read-only)|

#### 3.1.1 File Organization

Files within each bucket are organized by dispute:

```
evidence/
  {dispute_id}/
    {entity_type}/
      {entity_id}/
        {uuid}.{ext}

reports/
  {dispute_id}/
    v{version}/
      report.pdf
```

#### 3.1.2 Upload Flow

1. Client requests a signed upload URL from `/api/storage/upload-url`
   - Body: `{ bucket: 'evidence', dispute_id, entity_type, entity_id, file_name, file_type, file_size }`
2. Server validates the request:
   - Authenticates user via session token
   - Verifies user is a party or secretariat on the dispute
   - Validates file type (see 3.2)
   - Validates file size (max 25MB)
3. Server generates Supabase signed upload URL (60-second expiry)
4. Client uploads directly to Supabase Storage via the signed URL
5. Client calls `POST /api/storage/confirm` with the storage path
6. Server records the evidence metadata in the `evidence` table
7. Server queues a virus scan task (see 3.3)

```typescript
// Evidence metadata schema
interface EvidenceRecord {
  id: UUID;
  dispute_id: UUID;
  submission_id: UUID | null;    // Null until attached to a submission
  entity_type: 'complainant' | 'respondent' | 'third_party';
  entity_id: UUID;
  file_name: string;
  file_type: string;              // MIME type
  file_size: number;              // Bytes
  storage_bucket: string;
  storage_path: string;
  scan_status: 'pending' | 'clean' | 'quarantined';
  created_at: Timestamp;
  uploaded_by: UUID;
}
```

#### 3.1.3 Signed URLs for Secure Access

Files are never served with public URLs. Instead, all access goes through signed URLs with 15-minute expiration:

```typescript
// Server-side helper
async function getEvidenceSignedUrl(evidenceId: UUID): Promise<string> {
  const { data: evidence } = await supabase
    .from('evidence')
    .select('storage_bucket, storage_path')
    .eq('id', evidenceId)
    .single();

  const { data: signedUrl } = await supabase.storage
    .from(evidence.storage_bucket)
    .createSignedUrl(evidence.storage_path, 900); // 15 minutes

  return signedUrl;
}
```

**Access Control for Signed URLs:**
- Only authenticated users who are parties, panelists, or secretariat on the dispute can request a signed URL
- Signed URL generation is proxied through `/api/storage/signed-url/{evidenceId}` so that access control checks happen server-side
- The storage bucket is configured with `public = false` in Supabase; no Row Level Security (RLS) bypass is possible through direct URL access

### 3.2 File Validation

#### 3.2.1 Client-side Validation (Before Upload)

```typescript
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/tiff',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function validateFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: PDF, DOCX, JPEG, PNG, TIFF.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 25MB limit.` };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  return { valid: true };
}
```

#### 3.2.2 Server-side Validation (Before Signed URL Generation)

The server repeats all client-side checks plus additional sanitization:
- MIME type sniffing (check magic bytes, not just `Content-Type` header)
- Extension whitelist: `['.pdf', '.docx', '.jpeg', '.jpg', '.png', '.tiff', '.tif']`
- File size from `Content-Length` header (redundant check)
- Rejects double extensions (`file.pdf.exe`) and path traversal characters

#### 3.2.3 Virus Scan Placeholder

A `scan_status` column on the `evidence` table tracks scan results. The actual scanning is delegated to an external service (e.g., ClamAV or AWS Lambda with McAfee).

```typescript
// Placeholder for anti-virus scanning
// TODO: Integrate with ClamAV daemon or cloud AV service
async function scanEvidenceFile(storagePath: string): Promise<ScanResult> {
  // 1. Download file from Supabase Storage to temp directory
  // 2. Run clamscan --stdout {temp_path}
  // 3. Parse output for "OK" or "FOUND"
  // 4. Update evidence.scan_status accordingly
  // 5. If infected: move to quarantine, notify secretariat
  // 6. If clean: no action needed

  return { status: 'clean', threats: [] }; // Placeholder
}
```

The scan queue is processed via a simple polling mechanism: every 60 seconds, a background job (triggered by a Vercel Cron Job or a `setTimeout` in a serverless function with `maxDuration`) queries for `evidence WHERE scan_status = 'pending'` and processes each.

### 3.3 Upload UI Component

The upload component is a shadcn `Card` with a drag-and-drop zone:

```
┌──────────────────────────────────────────────┐
│  Drag & drop files here, or click to browse   │
│                                               │
│  Allowed: PDF, DOCX, JPEG, PNG, TIFF          │
│  Max size: 25MB per file                      │
│                                               │
│  [Upload Progress] ████████████░░░ 75%        │
│  evidence_2025_financial_data.pdf (12MB)      │
│  ─────────────────────────────────────────    │
│  [Add More Files]          [Upload All]       │
└──────────────────────────────────────────────┘
```

- Uses `react-dropzone` for drag-and-drop
- Shows individual file progress bars via TanStack Query's `useMutation` with `onProgress` (using Supabase's XMLHttpRequest upload method)
- On completion, each file shows a green checkmark and transitions to the evidence attachment step
- Failed uploads show a retry button

---

## 4. Full Text Search

### 4.1 Postgres FTS Implementation

The system uses **Postgres Full Text Search** across submissions, evidence descriptions, and dispute metadata.

#### 4.1.1 Search Vector Generation

```sql
-- Submissions search vector (populated by trigger)
CREATE OR REPLACE FUNCTION submissions_search_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.content->'issue_description'->>'summary', '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->'issue_description'->>'factual_background', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->'legal_basis'::text, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->'requested_remedy'->>'primary_remedy', '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submissions_search_trigger
  BEFORE INSERT OR UPDATE OF content ON submissions
  FOR EACH ROW EXECUTE FUNCTION submissions_search_update();

CREATE INDEX submissions_fts_idx ON submissions USING GIN(search_vector);
```

#### 4.1.2 Search Query API

```typescript
// GET /api/disputes/{disputeId}/search?q=subsidy+steel&type=submissions&page=1
async function searchDisputeContent(disputeId: string, query: string, filters: SearchFilters) {
  const { data } = await supabase.rpc('search_dispute_content', {
    dispute_id_param: disputeId,
    search_query: query,
    filter_type: filters.type,       // 'submissions' | 'evidence' | 'all'
    filter_entity: filters.entity,   // 'complainant' | 'respondent' | 'third_party' | null
    page_param: filters.page,
    page_size: 20,
  });
  return data;
}
```

#### 4.1.3 Stored Procedure

```sql
CREATE OR REPLACE FUNCTION search_dispute_content(
  dispute_id_param UUID,
  search_query TEXT,
  filter_type TEXT DEFAULT 'all',
  filter_entity TEXT DEFAULT NULL,
  page_param INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  result_type TEXT,
  result_id UUID,
  title TEXT,
  snippet TEXT,
  rank REAL
) LANGUAGE plpgsql AS $$
DECLARE
  search_tsquery TSQUERY := plainto_tsquery('english', search_query);
BEGIN
  RETURN QUERY
  SELECT
    'submission' AS result_type,
    s.id AS result_id,
    (s.content->'issue_description'->>'summary')::TEXT AS title,
    ts_headline('english', s.content::TEXT, search_tsquery, 'MaxWords=40, MinWords=20') AS snippet,
    ts_rank(s.search_vector, search_tsquery) AS rank
  FROM submissions s
  WHERE s.dispute_id = dispute_id_param
    AND (filter_entity IS NULL OR s.entity_type = filter_entity)
    AND (filter_type = 'all' OR filter_type = 'submissions')
    AND s.search_vector @@ search_tsquery
  UNION ALL
  SELECT
    'evidence' AS result_type,
    e.id AS result_id,
    e.file_name AS title,
    ts_headline('english', COALESCE(e.description, ''), search_tsquery, 'MaxWords=40, MinWords=20') AS snippet,
    ts_rank(to_tsvector('english', COALESCE(e.description, '')), search_tsquery) AS rank
  FROM evidence e
  WHERE e.dispute_id = dispute_id_param
    AND (filter_type = 'all' OR filter_type = 'evidence')
    AND to_tsvector('english', COALESCE(e.description, '')) @@ search_tsquery
  ORDER BY rank DESC
  LIMIT page_size
  OFFSET (page_param - 1) * page_size;
END;
$$;
```

### 4.2 Search UI

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search submissions and evidence...    [Filters ▾]│
├─────────────────────────────────────────────────────┤
│ Results for "subsidy steel" (42 matches)            │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Submission · Complainant · v3                    │ │
│ │ <mark>Subsidy</mark> on Indian <mark>steel</mark>│ │
│ │ violates Article 3 of SCM Agreement...           │ │
│ │ Rank: 0.89 · 2 hours ago                         │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Evidence · financial_data_2024.pdf               │ │
│ │ Contains export <mark>subsidy</mark> figures for│ │
│ │ the <mark>steel</mark> sector 2020-2024...       │ │
│ │ Rank: 0.72 · Uploaded 5 days ago                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [< Prev] Page 1 of 3 [Next >]                       │
└─────────────────────────────────────────────────────┘
```

- Search input has a 300ms debounce before triggering the query
- Results show highlighted snippets using `<mark>` tags
- Filters dropdown allows narrowing by type (submissions/evidence/all) and entity type
- Clicking a result navigates to the submission detail or evidence viewer
- Empty state shows "No results found. Try broadening your search terms."

---

## 5. Document Viewer

### 5.1 Viewer Component

The document viewer serves as the primary interface for reviewing evidence and submissions.

```typescript
// DocumentViewer component (shadcn Dialog or full-page layout)
interface DocumentViewerProps {
  evidenceId?: UUID;
  submissionVersionId?: UUID;
  disputeId: UUID;
  viewMode: 'evidence' | 'submission';
}
```

**Features:**
- **PDF Support**: Uses `react-pdf` (PDF.js wrapper) with text layer extraction for search highlighting
- **DOCX Support**: Renders via `mammoth.js` into styled HTML with WTO styling preserved
- **Image Support**: Native `<img>` with lightbox zoom
- **Metadata Panel**: Right sidebar showing file details, upload date, scan status, relevance description
- **Annotation**: Panelists can highlight text and add private notes (stored in `annotations` table, visible only to the annotator and secretariat)
- **Side-by-Side**: Two-panel mode for comparing submissions (e.g., complainant v3 vs respondent v2)

```
┌─────────────────────────────────────────────────────────┐
│ [← Back] Dispute DS-612 · Complainant Submission v3     │
├──────────────────────┬──────────────────────────────────┤
│ Document Panel       │ Metadata & Annotations            │
│                      │                                   │
│ ┌─────────────────┐  │ File: submission_v3.pdf           │
│ │                 │  │ Size: 2.4 MB                      │
│ │   (PDF content) │  │ Type: application/pdf             │
│ │                 │  │ Status: Under Review              │
│ │                 │  │ Submitted: 12 Mar 2026            │
│ │                 │  │ Scan: ✅ Clean                    │
│ │                 │  │ ═══════════════════               │
│ │                 │  │ Panelist Notes                    │
│ │                 │  │ ┌────────────────────────┐        │
│ │                 │  │ │ Note on paragraph 14   │        │
│ │                 │  │ │ regarding preliminary  │        │
│ │                 │  │ │ objection...           │        │
│ │                 │  │ └────────────────────────┘        │
│ └─────────────────┘  │ [+ Add Note]                     │
│ [Page 1 of 42] ◀ ▶  │                                   │
└──────────────────────┴──────────────────────────────────┘
```

### 5.2 PDF Text Layer Integration

`react-pdf` is configured with the text layer enabled so that:
- Users can select and copy text from PDFs
- FTS search results can highlight matching text within the PDF
- Screen readers can access the content

```typescript
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);

  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      loading={<Skeleton className="h-[600px] w-full" />}
      error={<ErrorState message="Failed to load document" />}
    >
      {Array.from({ length: numPages }, (_, i) => (
        <Page
          key={`page_${i + 1}`}
          pageNumber={i + 1}
          renderTextLayer
          renderAnnotationLayer={false}
          className="mb-4"
        />
      ))}
    </Document>
  );
}
```

### 5.3 Version Comparison View

The side-by-side comparison view uses a `diff` approach rendered at the document level:

```
┌──────────────────────┬──────────────────────┐
│ Complainant v2       │ Complainant v3       │
│ ────────────────     │ ────────────────     │
│                       │                       │
│ The measure           │ The **contested**     │
│ constitutes a         │ measure constitutes a │
│ violation of...       │ violation of GATT     │
│                       │ Article I because...  │
│                       │                       │
│ Changes highlighted   │ [Added text: bold]    │
│ in green/red.        │ [Removed: strikethru] │
└──────────────────────┴──────────────────────┘
```

- Uses `diff` library to compare plain text extracted from PDF/DOCX
- Shows added text in green background, removed text in red background with strikethrough
- Navigation arrows to jump between changes
- Summary bar: "+42 lines, -12 lines across 3 sections"

---

## 6. API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/disputes/{id}/submissions` | Create new submission |
| PATCH  | `/api/disputes/{id}/submissions/{sid}` | Update draft submission |
| POST   | `/api/disputes/{id}/submissions/{sid}/submit` | Submit (create version) |
| GET    | `/api/disputes/{id}/submissions/{sid}/versions` | List versions |
| GET    | `/api/disputes/{id}/submissions/{entity_type}/{entity_id}/v{version}` | Get specific version |
| POST   | `/api/storage/upload-url` | Request signed upload URL |
| GET    | `/api/storage/signed-url/{evidenceId}` | Get signed download URL |
| POST   | `/api/storage/confirm` | Confirm upload complete |
| GET    | `/api/disputes/{id}/search` | Full text search |

---

## 7. Error Handling

### 7.1 Submission Errors
- **Concurrent Edit**: If two users attempt to submit the same draft simultaneously, the second receives a `409 Conflict` with instructions to reload
- **Validation Failure**: Form validation errors are displayed inline per field with WTO-styled error messages (accent-red border, Sora italic caption)
- **Network Timeout**: Submission uses TanStack Query with `retry: 2, retryDelay: 1000`. After 3 failures, the submission is saved locally and a banner warns "Could not reach server. Your draft is saved locally."

### 7.2 Upload Errors
- **Partial Upload**: If upload fails mid-way, the client retries from the beginning (signed URL is regenerated)
- **Oversized File**: Rejected client-side with a toast. Server also validates and returns `413 Payload Too Large`
- **Storage Error**: Returns `500` with a secretariat notification triggered via error logging

---

## 8. Accessibility

- All form elements have proper `aria-label` and `aria-describedby` attributes
- File upload zone uses `role="button"` and supports keyboard activation (Enter/Space)
- Document viewer supports keyboard navigation: arrows for page turning, Tab through annotations
- Reduced motion: `useReducedMotion()` hook from Framer Motion disables page transition animations
- Focus management: after submitting, focus moves to the confirmation banner
- Color contrast: all text meets WCAG AA on the dark theme background (#05162D)

---

## 9. Testing Strategy

- **Unit**: React Hook Form validation schemas, file validation utilities, search query building
- **Integration**: Submission CRUD flow, upload flow, search endpoint (Vitest + @testing-library/react)
- **E2E**: Playwright tests for submission wizard complete flow, evidence upload, document viewer interactions, search
- **Accessibility**: axe-core integration in Playwright tests

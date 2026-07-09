# Phase 4: AI Report Generation System

## 1. Overview

Phase 4 introduces the AI-powered WTO Panel Report generation system. This system ingests all submissions and evidence from Phase 3, processes them through a structured 10-step AI pipeline, and produces a draft WTO panel report following the formal WTO dispute resolution document format. The report is then reviewed and edited by the Expert Body (EB) before publication.

The system is built on **Next.js 16.2.9**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **React Hook Form**, **TanStack Query**, **Supabase**, **LangChain** (for pipeline orchestration), and **OpenAI / Anthropic** (configurable LLM provider).

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

## 2. The 10-Step AI Pipeline

The pipeline is the core of the AI report system. Each step is a discrete, traceable operation. The pipeline is orchestrated by a state machine that persists progress and allows recovery from failures.

### 2.1 Pipeline State Machine

```typescript
enum PipelineStep {
  COLLECT = 'collect',
  NORMALIZE = 'normalize',
  EXTRACT_FACTS = 'extract_facts',
  RETRIEVE_WTO_LAW = 'retrieve_wto_law',
  COMPARE_CLAIMS = 'compare_claims',
  IDENTIFY_CONTRADICTIONS = 'identify_contradictions',
  IDENTIFY_GAPS = 'identify_gaps',
  GENERATE_REPORT = 'generate_report',
  GENERATE_CITATIONS = 'generate_citations',
  GENERATE_CONFIDENCE = 'generate_confidence',
}

enum PipelineStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}
```

Each pipeline run is recorded in `pipeline_runs`:

```sql
CREATE TABLE pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id      UUID NOT NULL REFERENCES disputes(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  current_step    TEXT,
  progress        REAL NOT NULL DEFAULT 0.0,  -- 0.0 to 1.0
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  token_usage     JSONB,  -- { total_tokens, prompt_tokens, completion_tokens, cost_estimate }
  version         INTEGER NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id)
);
```

### 2.2 Step Detail

#### Step 1: Collect

**Purpose**: Gather all submissions, evidence, and dispute metadata from the database.

**Input**: `dispute_id`

**Operations**:
```typescript
async function collect(disputeId: UUID): Promise<CollectOutput> {
  const [dispute, submissions, evidence, parties] = await Promise.all([
    getDispute(disputeId),
    getSubmissions(disputeId),
    getEvidence(disputeId),
    getParties(disputeId),
  ]);

  return {
    dispute: { title, status, filed_date, agreements_invoked },
    complainant: { submissions: [], evidence: [], representatives: [] },
    respondent: { submissions: [], evidence: [], representatives: [] },
    third_parties: [{ submissions: [], evidence: [], ... }],
    secretariat_notes: [],
    timeline: [],
  };
}
```

**Output**: A structured `CollectOutput` object that contains everything needed for subsequent steps. Evidence files are **not** included in full; instead, text is extracted (PDF-to-text, DOCX-to-text) and stored as `evidence_text` in a temporary pipeline working table.

**Error Recovery**: If a database query fails, the step retries up to 3 times with exponential backoff (500ms, 2s, 8s).

#### Step 2: Normalize

**Purpose**: Convert all submissions into a consistent, machine-readable format regardless of their source structure.

**Operations**:
- Map complainant, respondent, and third-party submissions to a unified `NormalizedSubmission` interface
- Extract all text from uploaded documents (PDF/DOCX) using `pdf-parse` and `mammoth.js`
- Standardize date formats to ISO 8601
- Standardize currency references to ISO 4217 codes
- Identify and tag all references to WTO agreements (e.g., "GATT 1994 Art. III:2" → `{ agreement: "GATT_1994", article: "III", paragraph: "2" }`)

```typescript
interface NormalizedSubmission {
  party: PartyInfo;
  type: 'complainant' | 'respondent' | 'third_party';
  claims: NormalizedClaim[];
  evidence: NormalizedEvidence[];
  requested_outcome: string;
  legal_arguments: NormalizedLegalArgument[];
}
```

**This step does not use the LLM.** It is purely algorithmic (regex-based agreement parsing, date parsing libraries, schema mapping).

#### Step 3: Extract Structured Facts

**Purpose**: Use the LLM to extract key claims, dates, factual assertions, and referenced agreements from the normalized submissions.

**LLM Call**:
```
System: You are an expert WTO legal analyst. Extract factual claims from the 
following dispute submission. For each claim, identify: the claiming party, 
the target party, the alleged violation, the agreement article cited, 
supporting factual assertions, and any dates or trade volumes mentioned.

Return the result as a JSON array of Claim objects.
```

**Output**:
```typescript
interface ExtractedClaim {
  claim_id: string;
  party: string;                    // Which party made the claim
  against: string;                  // Which party is accused
  agreement: string;                // WTO agreement reference
  article: string;
  allegation: string;               // Short description
  factual_assertions: string[];     // Key facts cited
  dates_mentioned: string[];        // Extracted dates
  trade_volumes?: { value: number; currency: string; };
  source_submission_id: UUID;
  source_paragraph?: string;        // For traceability
}
```

**Chunking Strategy** (see Section 4.1): Submissions larger than 8,000 tokens are chunked with overlap. Each chunk is processed independently, then claims are de-duplicated by similarity (cosine similarity > 0.85 = duplicate).

**Token Budget**: Approximately 6,000 tokens for a 10-claim submission.

#### Step 4: Retrieve Current WTO Information (RAG)

**Purpose**: Retrieve relevant WTO legal texts, panel precedents, and Appellate Body reports to ground the analysis in current WTO jurisprudence.

**Architecture**: This is a **RAG (Retrieval Augmented Generation)** system with a vector database.

**Vector Store Setup**:
```typescript
// Schema for the RAG vector store
interface WTOLegalDocument {
  id: UUID;
  title: string;
  document_type: 'agreement' | 'panel_report' | 'appellate_report' | 'working_procedure';
  agreement: string;
  articles: string[];
  content: string;                    // Full text
  content_chunks: string[];           // Pre-chunked (512 tokens each)
  embeddings: number[][];             // One per chunk, dimension 1536
  last_updated: Timestamp;
}
```

**Retrieval Process**:

1. Extract key terms from Step 3 output (agreements, articles, legal concepts)
2. Embed the search query using OpenAI `text-embedding-3-small` (dimension 1536)
3. Perform cosine similarity search against the WTO legal text embeddings
4. Retrieve top 10 most relevant chunks (threshold: similarity > 0.75)
5. Re-rank by BM25 score for diversity
6. Return context window of ~4,000 tokens of relevant legal text

**Current Implementation**: Placeholder vector store using `pgvector` on Supabase. Embeddings are stored in a `wto_legal_embeddings` table:

```sql
CREATE TABLE wto_legal_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL,
  chunk_index     INTEGER NOT NULL,
  chunk_text      TEXT NOT NULL,
  embedding       VECTOR(1536),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX wto_legal_embeddings_idx ON wto_legal_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

For Phase 4, the vector store is seeded with publicly available WTO agreements (GATT 1994, SCM Agreement, SPS Agreement, TBT Agreement, GATS, TRIPS, DSU). Panel and Appellate Body reports are included for the 50 most-cited cases (e.g., US-Shrimp, EC-Hormones, US-301 Trade Act, Canada-Aircraft, Brazil-Tyres).

#### Step 5: Compare Submitted Claims with Publicly Available Information

**Purpose**: Cross-reference each claim against the retrieved WTO legal texts and known factual information.

**LLM Call**:
```
System: You are a WTO dispute resolution expert. Given:
1. A claim made by {party} against {party}
2. The relevant WTO legal text sections
3. Publicly available information about the measure in question

Analyze whether the claim is supported by the legal texts and known facts.
Rate the alignment as: STRONG, MODERATE, WEAK, or CONTRADICTED.
Provide reasoning for your rating.
```

**Output**:
```typescript
interface ClaimComparison {
  claim_id: string;
  alignment: 'STRONG' | 'MODERATE' | 'WEAK' | 'CONTRADICTED';
  reasoning: string;
  supporting_legal_texts: string[];   // Citations to WTO law
  contradictory_evidence: string[];   // If applicable
}
```

**Token Budget**: ~8,000 tokens per claim comparison (4,000 for context + 4,000 for claim + analysis). Batch processing: up to 5 claims per LLM call to optimize token usage.

#### Step 6: Identify Contradictions

**Purpose**: Identify contradictions in two categories:
1. **Between parties**: Complainant says X, Respondent says not-X
2. **Between claims and known facts**: Claim asserts X, but publicly available information contradicts X

**LLM Call**:
```
System: Given the following claims and comparisons, identify all contradictions.
A contradiction exists when two statements cannot both be true.
Classify each as:
- INTER_PARTY: Complainant and Respondent disagree
- FACTUAL: Claim contradicts known public information
- INTERNAL: Party's own statements contradict each other
```

**Output**:
```typescript
interface Contradiction {
  id: string;
  type: 'INTER_PARTY' | 'FACTUAL' | 'INTERNAL';
  claim_a: string;              // First claim or statement
  claim_b: string;              // Contradicting claim or statement
  parties_involved: string[];
  resolution_notes: string;     // How the panel might resolve this
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

**De-duplication**: Contradictions are de-duplicated by normalized text similarity. If two LLM calls produce essentially the same contradiction (cosine > 0.9), only one is kept.

#### Step 7: Identify Missing Information

**Purpose**: Identify gaps in the submissions — information that would be needed for a complete panel determination but was not provided.

**LLM Call**:
```
System: Analyze the following dispute submissions and identify missing 
information. A panel needs: clear claims, factual evidence, legal basis, 
remedy requests. What is missing or insufficiently addressed?
```

**Output**:
```typescript
interface InformationGap {
  id: string;
  category: 'INCOMPLETE_CLAIM' | 'MISSING_EVIDENCE' | 'INSUFFICIENT_LEGAL_ARGUMENT' | 'UNCLEAR_REQUEST';
  description: string;
  requested_from: string;       // Which party should provide this
  suggested_action: string;     // What the panel should request
  severity: 'CRITICAL' | 'IMPORTANT' | 'MINOR';
}
```

#### Step 8: Generate Structured WTO Panel Report

**Purpose**: Generate the full WTO panel report following the formal WTO document structure.

**WTO Panel Report Structure**:
1. **Introduction**: Panel establishment, composition, terms of reference
2. **Factual Aspects**: Description of the measure, products, parties' submissions
3. **Parties' Requests**: Complainant's and Respondent's requests
4. **Legal Analysis**: Article-by-article analysis of each claim
5. **Findings**: Panel's determination on each claim
6. **Recommendations and Rulings**: Implementation recommendations
7. **Annexes**: Case citations, procedural timeline, evidence list

**LLM Call**:
```
System: Generate a WTO panel report section based on the following analysis.
Use formal WTO language. Follow the standard WTO panel report structure.
Each finding must be supported by reasoning and citations.
```

Each section is generated independently to manage token limits. The report generator has a **two-pass** architecture:
1. **First pass**: Generate detailed notes for each section
2. **Second pass**: Compose the formal text from the notes, ensuring consistent tone and cross-references

**Token Budget**: ~12,000 tokens per section (legal analysis sections are the largest). Total report: ~60,000-80,000 tokens.

#### Step 9: Generate Citations

**Purpose**: For every finding and statement in the report, generate citations to:
1. The specific submission paragraph or evidence file that supports it
2. The WTO legal text that governs it
3. The precedent case that guides interpretation

**LLM Call**:
```
System: Given the following report section and the source materials, 
generate proper WTO-style citations. Format: 
- For submissions: "Complainant's submission, para. {n}"
- For evidence: "Exhibit {label}"
- For WTO law: "{Agreement}, Article {n}:{m}"
- For precedent: "{Case Name} (DS{xxx}, para. {n})"
```

**Output**: Each paragraph in the report gets a `citations` metadata field:

```typescript
interface ReportCitation {
  paragraph_id: string;
  citations: Array<{
    type: 'submission' | 'evidence' | 'wto_law' | 'precedent';
    reference: string;
    source_id: UUID;
    url?: string;                 // Link to the source in the system
  }>;
}
```

#### Step 10: Generate Confidence Score

**Purpose**: Assign a confidence score (0.0 to 1.0) to each section of the report and an overall confidence score.

**Scoring Dimensions**:
1. **Evidence Strength** (0-1): How well-supported are the findings by submitted evidence
2. **Legal Clarity** (0-1): How clear and unambiguous is the applicable law
3. **Factual Certainty** (0-1): How certain are the underlying facts
4. **Contradiction Resolution** (0-1): How clearly contradictions are resolved
5. **Gap Severity** (0-1): Inverse of how many/severe information gaps exist

**LLM Call**:
```
System: Rate the confidence of each section of the following WTO panel 
report on a scale of 0.0 to 1.0. Consider: evidence quality, legal clarity, 
factual certainty, contradiction resolution, and information gaps.
Provide a brief justification for each score.
```

**Output**:
```typescript
interface ConfidenceScore {
  overall: number;
  dimensions: {
    evidence_strength: number;
    legal_clarity: number;
    factual_certainty: number;
    contradiction_resolution: number;
    gap_severity: number;       // Inverted: 1 = no gaps
  };
  per_section: Array<{
    section_title: string;
    score: number;
    justification: string;
  }>;
  low_confidence_areas: string[];   // Specific paragraphs flagged for human review
}
```

Confidence scores are displayed in the report editor as color-coded indicators:
- **≥ 0.85**: Green — likely reliable
- **0.70 – 0.84**: Amber — human review recommended
- **< 0.70**: Red — significant human review required

---

## 3. Pipeline Orchestration

### 3.1 Execution Model

The pipeline runs asynchronously using Supabase's `pgmq` (or a simple polling table) as a job queue:

```sql
CREATE TABLE pipeline_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES pipeline_runs(id),
  step            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  next_retry_at   TIMESTAMPTZ,
  payload         JSONB,
  result          JSONB,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);
```

**Client-side polling**: The frontend polls `GET /api/pipeline-runs/{runId}` every 5 seconds to get the current step and progress. The response includes:

```json
{
  "status": "running",
  "current_step": "extract_facts",
  "progress": 0.35,
  "estimated_time_remaining_seconds": 120,
  "token_usage_so_far": { "total": 45000, "cost": 0.89 }
}
```

A **progress UI** shows the pipeline stages with a stepper:

```
┌──────────────────────────────────────────────┐
│ AI Report Generation Pipeline                │
│                                              │
│ ✅ Collect    ✅ Normalize    🔄 Extract Facts│
│ ⬜ Retrieve   ⬜ Compare      ⬜ Contradictions│
│ ⬜ Gaps       ⬜ Report       ⬜ Citations     │
│ ⬜ Confidence                                 │
│                                              │
│ Progress: ■■■■■■■■■■■■□□□□□□ 65%             │
│ Token usage: 45,000 ($0.89)                  │
│ Est. remaining: 2 minutes                    │
└──────────────────────────────────────────────┘
```

### 3.2 Error Recovery with Retry and Backoff

Each step has configurable retry:

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoff: 'exponential',            // 500ms, 2s, 8s
  retryableErrors: [
    'LLM_TIMEOUT',
    'LLM_RATE_LIMIT',
    'LLM_SERVICE_ERROR',
    'DATABASE_TIMEOUT',
    'NETWORK_ERROR',
  ],
  nonRetryableErrors: [
    'INVALID_INPUT',
    'AUTHENTICATION_ERROR',
    'INSUFFICIENT_QUOTA',
  ],
};
```

**Implementation**:
1. When a step fails with a retryable error, the job's `status` is set to `retrying`, `attempts` is incremented, and `next_retry_at` is set to `NOW() + (500ms * 2^attempts)`
2. A cron job runs every 30 seconds, querying `pipeline_jobs WHERE status = 'retrying' AND next_retry_at < NOW()`
3. After `max_attempts` exhausted, the job is marked `failed` and the pipeline is paused
4. The pipeline UI shows a red error state with the error message and a "Retry" button
5. The user can also "Edit & Retry" to modify the pipeline parameters before retrying

### 3.3 Token Optimization

Token usage is tracked per step and per pipeline run. Optimization strategies:

1. **Prompt Compression**: Remove unnecessary whitespace, use structured output format instructions instead of lengthy descriptions
2. **Chunking Overlap Optimization**: 10% overlap instead of 20% for large documents (saves ~8% tokens)
3. **Caching Identical Prompts**: If the same dispute is regenerated, cache the LLM response for steps 2-4 (normalize, extract, retrieve) since these are deterministic given the same inputs
4. **Batch LLM Calls**: Steps 3, 5, and 6 can batch multiple claims into a single LLM call, reducing per-call overhead
5. **Model Tiering**: Use `gpt-4o-mini` for steps 2-4 (simple extraction), `gpt-4o` for steps 5-8 (complex reasoning), and `gpt-4o` for step 10 (nuanced evaluation)

```typescript
const MODEL_TIER: Record<PipelineStep, string> = {
  collect: null,                          // No LLM
  normalize: null,                        // No LLM
  extract_facts: 'gpt-4o-mini',          // Simple extraction
  retrieve_wto_law: null,                // Embedding + search
  compare_claims: 'gpt-4o',              // Complex reasoning
  identify_contradictions: 'gpt-4o',      // Nuanced analysis
  identify_gaps: 'gpt-4o-mini',          // Pattern recognition
  generate_report: 'gpt-4o',            // Highest quality
  generate_citations: 'gpt-4o-mini',     // Mechanical task
  generate_confidence: 'gpt-4o',         // Nuanced evaluation
};
```

### 3.4 Caching Strategy

```sql
CREATE TABLE llm_response_cache (
  cache_key       TEXT PRIMARY KEY,         -- SHA256 of normalized prompt + model
  response        JSONB NOT NULL,
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_count     INTEGER NOT NULL,
  hits            INTEGER NOT NULL DEFAULT 1
);
```

**Cache Invalidation**: The cache key includes:
- Step name
- SHA256 of the normalized input (sorted keys, trimmed whitespace)
- Model name
- Prompt template version (to invalidate when prompts are updated)

Cache entries expire after 7 days. Steps 2 (normalize) and 3 (extract facts) have the highest cache hit rate since the same submissions produce identical outputs.

---

## 4. Prompt Engineering Strategy

### 4.1 System Prompt Architecture

Each step has a three-part system prompt:

1. **Role Definition**: Establishes the LLM's persona as a WTO expert
2. **Task Instruction**: Clear, structured description of the specific task
3. **Output Format**: JSON schema specification for structured output

Example — Step 3 (Extract Facts):

```typescript
const EXTRACT_FACTS_SYSTEM_PROMPT = `You are an expert WTO legal analyst and dispute resolution specialist.

Your task is to extract structured factual claims from WTO dispute submissions. For each claim, identify:
1. Which party is making the claim
2. Which party is the target of the claim
3. The WTO agreement and article cited
4. The specific allegation
5. Supporting factual assertions
6. Any dates, trade volumes, or monetary amounts mentioned

Focus ONLY on factual assertions, not legal arguments. A factual assertion is a statement about what happened, what exists, or what was done — not an interpretation of whether it violates an agreement.

Return a JSON object with this exact structure:
{
  "claims": [
    {
      "party": string,
      "against": string,
      "agreement": string,
      "article": string,
      "allegation": string,
      "factual_assertions": string[],
      "dates_mentioned": string[],
      "trade_volume": { "value": number | null, "currency": string | null },
      "source_paragraph": string | null
    }
  ]
}

If no claims are found, return { "claims": [] }.
Do not include any text outside the JSON object.`;
```

### 4.2 Context Construction

The context passed to the LLM for each step is constructed from pipeline data and formatted as a structured document:

```typescript
function buildReportContext(dispute: DisputeData, step: PipelineStep): string {
  const sections = [];

  // Common context for all steps
  sections.push(`# Dispute Overview`);
  sections.push(`Dispute: ${dispute.title} (DS-${dispute.number})`);
  sections.push(`Complainant: ${dispute.complainant}`);
  sections.push(`Respondent: ${dispute.respondent}`);
  sections.push(`Agreements Invoked: ${dispute.agreements.join(', ')}`);
  sections.push(``);

  // Step-specific context
  switch (step) {
    case 'extract_facts':
      sections.push(`# Complainant Submission`);
      sections.push(dispute.complainant.submission.content);
      sections.push(``);
      sections.push(`# Respondent Submission`);
      sections.push(dispute.respondent.submission.content);
      break;

    case 'compare_claims':
      sections.push(`# Extracted Claims`);
      sections.push(JSON.stringify(dispute.extracted_claims, null, 2));
      sections.push(``);
      sections.push(`# Relevant WTO Legal Texts`);
      sections.push(dispute.rag_context);
      break;

    case 'generate_report':
      sections.push(`# All Analysis`);
      sections.push(`## Extracted Claims`);
      sections.push(JSON.stringify(dispute.extracted_claims, null, 2));
      sections.push(`## Claim Comparisons`);
      sections.push(JSON.stringify(dispute.claim_comparisons, null, 2));
      sections.push(`## Contradictions`);
      sections.push(JSON.stringify(dispute.contradictions, null, 2));
      sections.push(`## Information Gaps`);
      sections.push(JSON.stringify(dispute.information_gaps, null, 2));
      break;
  }

  return sections.join('\n');
}
```

### 4.3 Chunking Strategy for Large Submissions

Submissions may exceed the LLM's context window (typically 128K tokens for `gpt-4o`, but we budget 32K for safety).

```typescript
function chunkSubmission(text: string, maxTokens: number = 8000, overlapTokens: number = 800): string[] {
  // Token estimation: ~4 characters per token for legal English
  const estimatedTokens = text.length / 4;

  if (estimatedTokens <= maxTokens) {
    return [text];
  }

  const chunks: string[] = [];
  const overlapChars = overlapTokens * 4;
  const chunkChars = maxTokens * 4;
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    // Try to break at paragraph boundary
    const breakPoint = text.lastIndexOf('\n\n', end);
    const chunkEnd = (breakPoint > start + chunkChars / 2) ? breakPoint : end;
    chunks.push(text.slice(start, chunkEnd));
    start = chunkEnd - overlapChars;
  }

  return chunks;
}
```

Each chunk is processed independently. Results are merged with de-duplication based on semantic similarity (for claims) or string matching (for citations).

---

## 5. Report Generation and Versioning

### 5.1 Report Data Model

```sql
CREATE TABLE ai_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id      UUID NOT NULL REFERENCES disputes(id),
  version         INTEGER NOT NULL,
  pipeline_run_id UUID NOT NULL REFERENCES pipeline_runs(id),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','published','archived')),
  content         JSONB NOT NULL,     -- Full report with all sections
  confidence      JSONB,             -- Confidence scores from step 10
  citations       JSONB,             -- Citation metadata
  executive_summary TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users(id),
  UNIQUE(dispute_id, version)
);
```

### 5.2 Report Content Structure

```typescript
interface AIReportContent {
  metadata: {
    dispute_number: string;
    title: string;
    date_generated: string;
    panel_members: string[];
    version: number;
  };
  sections: Array<{
    id: string;
    type: 'introduction' | 'factual_aspects' | 'parties_requests' | 'legal_analysis' | 'findings' | 'recommendations';
    title: string;
    content: string;              // Markdown-formatted report text
    confidence: number;           // Per-section confidence (0-1)
    citations: ReportCitation[];
    editable: boolean;
    word_count: number;
  }>;
  annexes: {
    case_citations: string[];
    procedural_timeline: TimelineEvent[];
    evidence_list: string[];
  };
  overall_confidence: number;
}
```

### 5.3 Versioning

Each pipeline regeneration produces a new version:

```typescript
async function generateNewReport(disputeId: UUID, userId: UUID): Promise<UUID> {
  const currentMaxVersion = await getMaxVersion(disputeId);
  const newVersion = currentMaxVersion + 1;

  const pipelineRun = await createPipelineRun(disputeId, newVersion, userId);
  // Pipeline executes...
  const report = await createReport(disputeId, newVersion, pipelineRun.id, generatedContent);

  return report.id;
}
```

Versions are accessible at: `/disputes/{disputeId}/reports/v{version}`

A **Version History** panel lists all versions:

```
┌──────────────────────────────────────────────┐
│ Report Versions                              │
│                                              │
│ v3  Draft  Today 14:30  ⬤ 92%  [View]       │
│ v2  Draft  Today 09:15  ⬤ 87%  [View] [Diff]│
│ v1  Draft  Yesterday     ⬤ 76%  [View] [Diff]│
└──────────────────────────────────────────────┘
```

---

## 6. Human Review Cycle

### 6.1 EB Review Interface

After the AI generates the report, it enters the **Human Review Cycle**:

1. **AI Draft**: Report generated, status = `draft`
2. **EB Review**: Panel members review each section
3. **Editing**: EB can edit sections directly (see 6.2)
4. **Approval**: EB marks report as `under_review` when done editing
5. **EB Chair Review**: Chair gives final sign-off
6. **Ready for Publication**: Status = `approved` (handled in Phase 5)

### 6.2 Editable Report

The report editor is a rich text component built on **TipTap** (ProseMirror-based) with WTO-specific formatting:

```
┌──────────────────────────────────────────────┐
│ [Save] [Revert Section] [Request Regen] 💬   │
├──────────────────────────────────────────────┤
│ ╔══════════════════════════════════════════╗  │
│ ║    5. Legal Analysis                     ║  │
│ ║                                          ║  │
│ ║  A. Claim under GATT Article III:2       ║  │
│ ║                                          ║  │
│ ║  The panel finds that the measure [is a  ║  │
│ ║  internal regulation] within the meaning ║  │
│ ║  of Article III:2...                     ║  │
│ ║                                          ║  │
│ ║  ┌────────────────────────────────────┐   ║  │
│ ║  │ 🟢 Evidence Strong                 │   ║  │
│ ║  │ 🟡 Legal Clarity: Moderate         │   ║  │
│ ║  │ 🟢 Factual Certainty: High         │   ║  │
│ ║  └────────────────────────────────────┘   ║  │
│ ╚══════════════════════════════════════════╝  │
│                                              │
│ Confidence: 0.84 🟢                          │
│ Last edited by: EB Member A (14:25)          │
└──────────────────────────────────────────────┘
```

**Features**:
- Each section is independently editable
- Confidence badges are displayed per section
- "Request Regen" button sends feedback to regenerate a specific section (sends the edited text + edit notes as context to the LLM for a targeted regeneration)
- Changes are tracked with author and timestamp
- "Revert Section" restores the AI-generated original
- Auto-save every 15 seconds (stored in `report_edit_sessions`)

### 6.3 Annotation and Comments

EB members can add comments to specific paragraphs:

```typescript
interface ReportComment {
  id: UUID;
  report_id: UUID;
  section_id: string;
  paragraph_index: number;
  author_id: UUID;
  body: string;
  resolved: boolean;
  created_at: Timestamp;
  edited_at: Timestamp;
}
```

Comments are displayed in a right-sidebar when a paragraph is selected. Threaded replies are supported. Resolved comments are collapsed by default.

---

## 7. API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/disputes/{id}/pipeline/run` | Start new AI pipeline run |
| GET    | `/api/disputes/{id}/pipeline/runs` | List pipeline runs |
| GET    | `/api/pipeline-runs/{runId}` | Get pipeline run status |
| POST   | `/api/pipeline-runs/{runId}/retry` | Retry failed pipeline |
| GET    | `/api/disputes/{id}/reports` | List report versions |
| GET    | `/api/disputes/{id}/reports/v{version}` | Get specific report version |
| PATCH  | `/api/disputes/{id}/reports/{reportId}` | Update report section (EB edit) |
| GET    | `/api/disputes/{id}/reports/{reportId}/diff?v1={v}&v2={v}` | Diff between versions |
| POST   | `/api/disputes/{id}/reports/{reportId}/regenerate-section` | Regenerate specific section |
| POST   | `/api/disputes/{id}/reports/{reportId}/comments` | Add comment |
| PATCH   | `/api/disputes/{id}/reports/{reportId}/comments/{cId}` | Resolve comment |
| POST   | `/api/disputes/{id}/reports/{reportId}/approve` | Approve report for publication |

---

## 8. Database Schema Summary

```sql
-- Pipeline tracking
CREATE TABLE pipeline_runs (...);       -- Defined in 2.1
CREATE TABLE pipeline_jobs (...);       -- Defined in 3.1
CREATE TABLE llm_response_cache (...);  -- Defined in 3.4

-- Report storage
CREATE TABLE ai_reports (...);          -- Defined in 5.1
CREATE TABLE report_edit_sessions (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES ai_reports(id),
  editor_id UUID NOT NULL REFERENCES users(id),
  section_id TEXT NOT NULL,
  original_content TEXT NOT NULL,
  edited_content TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE report_comments (...);     -- Defined in 6.2

-- RAG system
CREATE TABLE wto_legal_texts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  agreement TEXT,
  articles TEXT[],
  content TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL
);
CREATE TABLE wto_legal_embeddings (...); -- Defined in 4.1
```

---

## 9. Testing Strategy

- **Unit tests**: Prompt template construction, context building, chunking algorithm, confidence score calculation
- **Integration tests**: Pipeline orchestration (mock LLM calls), report versioning, EB edit flow
- **E2E tests**: Full pipeline run (using test dispute with known submissions), report editing, comment workflow
- **LLM eval tests**: Automated evaluation of generated reports against known outcomes from historical WTO disputes (precision, recall of claim extraction, citation accuracy)
- **Performance tests**: Pipeline completion time for disputes with large submissions (10MB+), token usage tracking

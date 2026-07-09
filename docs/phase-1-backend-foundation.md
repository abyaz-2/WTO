# WTO Digital Dispute Documentation Platform — Phase 1 SRS

## Backend Infrastructure, Database Schema, API Foundation & Storage Setup

**Version:** 1.0  
**Status:** Draft  
**Author:** Systems Architecture  
**Date:** 2026-07-08

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Backend Folder Structure](#3-backend-folder-structure)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [Service Layer Design](#6-service-layer-design)
7. [Storage Bucket Design](#7-storage-bucket-design)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Architecture Overview

### 1.1 System Context

The WTO Digital Dispute Documentation Platform is a document-centric system that manages the lifecycle of trade disputes from issue submission through AI-assisted report generation and fact-checking. Phase 1 establishes the backend foundation that all subsequent phases build upon.

### 1.2 Architecture Diagram

```
                         ┌───────────────────────────────┐
                         │         Client Layer          │
                         │  Next.js App (Vercel Hosted)  │
                         │       TanStack Query          │
                         └──────────────┬────────────────┘
                                        │ HTTPS / JWT Bearer
                                        ▼
                    ┌───────────────────────────────────────┐
                    │           API Gateway Layer           │
                    │        FastAPI (Railway / Fly.io)     │
                    │                                      │
                    │  ┌─────────┐ ┌────────┐ ┌─────────┐  │
                    │  │  Auth   │ │Request │ │  Rate   │  │
                    │  │Middleware│ │Logger  │ │ Limiter │  │
                    │  └─────────┘ └────────┘ └─────────┘  │
                    └──────────────────┬────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │   Service Layer    │  │   Service Layer    │  │   Service Layer    │
   │   Issue Service    │  │  Submission Svc    │  │    AI Service      │
   │ Participant Svc    │  │  Evidence Svc      │  │  FactCheck Svc     │
   │ Notification Svc   │  │  Auth Service      │  │   Revision Svc     │
   └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘
            │                       │                        │
            ▼                       ▼                        ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │  Repository Layer  │  │  Repository Layer  │  │  Repository Layer  │
   │  SQLAlchemy        │  │  SQLAlchemy        │  │  SQLAlchemy        │
   │  Repositories      │  │  Repositories      │  │  Repositories      │
   └────────┬───────────┘  └────────┬───────────┘  └────────┬───────────┘
            │                       │                        │
            └───────────────────────┼────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────────┐
                    │         Data Layer                    │
                    │                                       │
                    │  ┌─────────────────────────────────┐  │
                    │  │     PostgreSQL (Supabase)       │  │
                    │  │  - Relational Data              │  │
                    │  │  - Full-Text Search Indexes     │  │
                    │  │  - JSONB for flexible fields    │  │
                    │  └─────────────────────────────────┘  │
                    │                                       │
                    │  ┌─────────────────────────────────┐  │
                    │  │     Redis (Upstash)             │  │
                    │  │  - Session Cache                │  │
                    │  │  - Rate Limit Counters          │  │
                    │  │  - Background Task Queue        │  │
                    │  │  - Search Result Cache          │  │
                    │  └─────────────────────────────────┘  │
                    │                                       │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Supabase Storage               │  │
                    │  │  - evidence/ bucket             │  │
                    │  │  - reports/ bucket              │  │
                    │  │  - avatars/ bucket              │  │
                    │  └─────────────────────────────────┘  │
                    └───────────────────────────────────────┘
```

### 1.3 Request Lifecycle

```
Client Request
    │
    ▼
CORS Middleware ────► Auth Middleware (JWT verification via Supabase)
    │                      │
    │                      ▼ (if authenticated)
    │              Rate Limiter (Redis-backed)
    │                      │
    │                      ▼
    │              Structured Logger (request_id, user_id, action)
    │                      │
    │                      ▼
    │              Router → Dependency Injection
    │                      │
    │                      ▼
    │              Service Layer (business logic, validation)
    │                      │
    │                      ▼
    │              Repository Layer (SQLAlchemy ORM)
    │                      │
    │                      ▼
    │              PostgreSQL (Supabase)
    │                      │
    │                      ▼
    │              Response Serializer
    │                      │
    └──────────────────────┘
                    │
                    ▼
          JSON Response { data, error, pagination }
```

---

## 2. Tech Stack & Dependencies

### 2.1 Core Framework

| Component          | Technology     | Version | Purpose                            |
|--------------------|----------------|---------|-------------------------------------|
| Web Framework      | FastAPI        | 0.115+  | REST API serving                    |
| ASGI Server        | Uvicorn        | 0.32+   | Production ASGI server              |
| ORM                | SQLAlchemy     | 2.0+    | Database abstraction & querying     |
| Migration Tool     | Alembic        | 1.14+   | Schema version control              |
| Validation         | Pydantic v2    | 2.9+    | Request/response validation         |
| Auth Provider      | Supabase Auth  | —       | JWT issuance & user management      |
| Database           | Supabase PG    | 15+     | Primary data store                  |
| Cache              | Redis (Upstash)| 7+      | Sessions, rate limits, task queue   |
| Task Queue         | Arq            | 0.12+   | Background job processing           |
| Logging            | structlog      | 24+     | Structured JSON logging             |
| HTTP Client        | httpx          | 0.28+   | Outbound API calls (Supabase admin) |

### 2.2 Python Dependencies (requirements.txt)

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
alembic==1.14.0
pydantic==2.9.2
pydantic-settings==2.6.0
supabase==2.6.0
httpx==0.28.0
redis[cluster]==5.2.0
arq==0.12.0
structlog==24.4.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.17
boto3==1.35.0         # Supabase S3-compatible storage
python-dotenv==1.0.1
psycopg2-binary==2.9.9
asyncpg==0.30.0
```

---

## 3. Backend Folder Structure

```
backend/
├── alembic/
│   ├── versions/               # Migration files
│   ├── env.py                  # Alembic environment config
│   └── script.py.mako          # Migration template
├── alembic.ini                 # Alembic configuration
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application factory
│   ├── config.py               # Pydantic Settings (env vars)
│   ├── dependencies.py         # FastAPI dependency injection
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # Aggregate all v1 routers
│   │   │   ├── health.py       # GET /api/v1/health
│   │   │   ├── auth.py         # Auth-related endpoints
│   │   │   ├── users.py        # Users endpoints
│   │   │   ├── issues.py       # Issues CRUD endpoints
│   │   │   ├── participants.py # Participants endpoints
│   │   │   ├── submissions.py  # Submissions endpoints
│   │   │   ├── evidence.py     # Evidence endpoints
│   │   │   ├── ai_reports.py   # AI report endpoints
│   │   │   ├── fact_checks.py  # Fact check endpoints
│   │   │   ├── notifications.py# Notifications endpoints
│   │   │   └── revisions.py    # Revision history endpoints
│   │   └── deps/
│   │       ├── __init__.py
│   │       ├── pagination.py   # Pagination dependency
│   │       ├── filters.py      # Filtering dependency
│   │       └── auth.py         # Auth dependency (get_current_user)
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py         # JWT decoding, RBAC checks
│   │   ├── middleware.py        # CORS, logging, rate-limit middleware
│   │   ├── exceptions.py       # Custom exception classes
│   │   ├── error_handlers.py   # Exception → JSON response handlers
│   │   ├── rate_limiter.py     # Redis-backed rate limiter
│   │   └── constants.py        # Enums, status codes, bucket names
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py             # DeclarativeBase, common mixins
│   │   ├── user.py             # User SQLAlchemy model
│   │   ├── issue.py            # Issue model
│   │   ├── participant.py      # Participant model
│   │   ├── submission.py       # Submission model
│   │   ├── evidence.py         # Evidence model
│   │   ├── ai_report.py        # AIReport model
│   │   ├── fact_check.py       # FactCheck model
│   │   ├── revision.py         # Revision model
│   │   ├── notification.py     # Notification model
│   │   ├── audit_log.py        # AuditLog model
│   │   └── session.py          # Session model
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py            # PaginatedResponse, ErrorResponse
│   │   ├── user.py             # UserCreate, UserUpdate, UserRead
│   │   ├── issue.py            # IssueCreate, IssueUpdate, IssueRead
│   │   ├── participant.py      # ParticipantCreate, ParticipantRead
│   │   ├── submission.py       # SubmissionCreate, SubmissionRead
│   │   ├── evidence.py         # EvidenceCreate, EvidenceRead
│   │   ├── ai_report.py        # AIReportCreate, AIReportRead
│   │   ├── fact_check.py       # FactCheckCreate, FactCheckRead
│   │   ├── notification.py     # NotificationRead
│   │   └── revision.py         # RevisionRead
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py             # BaseRepository (CRUD, soft delete)
│   │   ├── user_repository.py
│   │   ├── issue_repository.py
│   │   ├── participant_repository.py
│   │   ├── submission_repository.py
│   │   ├── evidence_repository.py
│   │   ├── ai_report_repository.py
│   │   ├── fact_check_repository.py
│   │   ├── revision_repository.py
│   │   ├── notification_repository.py
│   │   ├── audit_log_repository.py
│   │   └── session_repository.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # Supabase auth integration
│   │   ├── user_service.py
│   │   ├── issue_service.py
│   │   ├── participant_service.py
│   │   ├── submission_service.py
│   │   ├── evidence_service.py
│   │   ├── ai_report_service.py
│   │   ├── fact_check_service.py
│   │   ├── notification_service.py
│   │   ├── revision_service.py
│   │   ├── storage_service.py  # Supabase Storage wrapper
│   │   └── audit_service.py    # Audit logging
│   │
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── arq_settings.py     # Arq Worker settings (Redis pool)
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── ai_generation.py  # AI report generation (Phase 3)
│   │   │   ├── notification_dispatch.py
│   │   │   ├── file_validation.py  # Virus scan placeholder
│   │   │   └── cleanup.py       # Temp file cleanup
│   │   └── worker.py           # Arq worker entrypoint
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── client.py           # Supabase S3 client init
│   │   ├── buckets.py          # Bucket policy definitions
│   │   └── validation.py       # File type, size validation
│   │
│   └── logging/
│       ├── __init__.py
│       ├── config.py           # structlog configuration
│       └── middleware.py        # Request-ID middleware
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Pytest fixtures (test DB, client)
│   ├── factories/              # Factory boy factories
│   │   ├── __init__.py
│   │   ├── user_factory.py
│   │   ├── issue_factory.py
│   │   └── participant_factory.py
│   ├── unit/
│   │   ├── test_issue_service.py
│   │   ├── test_participant_service.py
│   │   ├── test_auth_service.py
│   │   └── test_storage_validation.py
│   └── integration/
│       ├── test_health.py
│       ├── test_issues_api.py
│       ├── test_participants_api.py
│       └── test_submissions_api.py
│
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
├── docker-compose.yml          # Local PG + Redis for dev
├── pyproject.toml
└── .env.example
```

---

## 4. Database Schema

### 4.1 Common Column Patterns

Every table includes these base columns inherited from `BaseModel`:

| Column       | Type                     | Constraints                         |
|-------------|--------------------------|--------------------------------------|
| id          | UUID                     | PK, default uuid_generate_v4()      |
| created_at  | TIMESTAMPTZ              | NOT NULL, default now()             |
| updated_at  | TIMESTAMPTZ              | NOT NULL, default now(), on-update  |
| version     | INTEGER                  | NOT NULL, default 1                 |
| is_deleted  | BOOLEAN                  | NOT NULL, default FALSE             |

### 4.2 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐
│    users     │1───n│ participants     │
└──────────────┘     └──────────────────┘
     │                     │      │
     │                     │      └──────────────────┐
     │                     │                         │
     │                     ▼                         ▼
     │              ┌──────────────┐         ┌──────────────┐
     │              │ submissions  │         │  evidence    │
     │              └──────────────┘         └──────────────┘
     │                     │
     │                     ▼
     │              ┌──────────────┐
     │              │  ai_reports  │
     │              └──────────────┘
     │                     │
     │                     ▼
     │              ┌──────────────┐
     │              │ fact_checks  │
     │              └──────────────┘
     │
     │              ┌──────────────┐
     ├──────────────│ issues       │
     │              └──────────────┘
     │
     │              ┌──────────────┐
     ├──────────────│ notifications│
     │              └──────────────┘
     │
     │              ┌──────────────┐
     ├──────────────│ audit_logs   │
     │              └──────────────┘
     │
     │              ┌──────────────┐
     └──────────────│ sessions     │
                    └──────────────┘

┌──────────────┐     ┌──────────────┐
│  revisions   │─────│ (polymorphic)│
└──────────────┘     └──────────────┘
  revisable_type + revisable_id
```

### 4.3 Table Definitions

#### 4.3.1 `users`

Extends Supabase `auth.users`. This table stores WTO-platform-specific profile data linked by foreign key to the Supabase auth user.

| Column          | Type         | Constraints                          |
|-----------------|--------------|---------------------------------------|
| id              | UUID         | PK, FK → auth.users.id ON DELETE CASCADE |
| email           | VARCHAR(255) | NOT NULL, UNIQUE, INDEX              |
| display_name    | VARCHAR(255) | NOT NULL                             |
| avatar_url      | VARCHAR(512) | NULLABLE                             |
| role            | VARCHAR(50)  | NOT NULL, DEFAULT 'delegate', CHECK(role IN ('executive_board', 'delegate')) |
| is_active       | BOOLEAN      | NOT NULL, DEFAULT TRUE               |
| last_login_at   | TIMESTAMPTZ  | NULLABLE                             |
| metadata        | JSONB        | NULLABLE                             |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version         | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted      | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_users_email` ON email (UNIQUE)
- `ix_users_role` ON role
- `ix_users_is_active` ON is_active

**Notes:**
- `id` must match `auth.users.id` from Supabase. The user record is created via a Supabase Auth trigger or via the API on signup.
- `role` is the RBAC attribute. Only `executive_board` and `delegate` are valid.

#### 4.3.2 `issues`

| Column          | Type         | Constraints                          |
|-----------------|--------------|---------------------------------------|
| id              | UUID         | PK                                    |
| issue_number    | VARCHAR(20)  | NOT NULL, UNIQUE, INDEX              |
| title           | VARCHAR(500) | NOT NULL                             |
| description     | TEXT         | NOT NULL                             |
| complainant_id  | UUID         | NOT NULL, FK → users.id ON DELETE RESTRICT |
| current_status  | VARCHAR(50)  | NOT NULL, DEFAULT 'draft', CHECK(current_status IN ('draft','submitted','under_review','rejected','approved','published','registration_open','registration_closed','submission_phase','evidence_phase','ai_processing','eb_review','fact_checking','final_revision','final_published','archived')) |
| timeline        | JSONB        | NOT NULL, DEFAULT '[]'               |
| published_report_url | VARCHAR(512) | NULLABLE                          |
| metadata        | JSONB        | NULLABLE                             |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version         | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted      | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_issues_issue_number` ON issue_number (UNIQUE)
- `ix_issues_current_status` ON current_status
- `ix_issues_complainant_id` ON complainant_id
- `ix_issues_created_at` ON created_at DESC
- Full-text search GIN index: `ix_issues_fts` ON to_tsvector('english', title || ' ' || description)

**Constraints:**
- CHECK `issue_number` matches pattern `DSB-\d{4}-\d{3}` (e.g., DSB-2026-001)

**Notes:**
- `timeline` stores an array of `{ status, timestamp, changed_by }` objects as JSONB.
- `issue_number` is auto-generated as `DSB-{year}-{sequential}` using a database sequence.

#### 4.3.3 `participants`

| Column       | Type         | Constraints                          |
|--------------|--------------|---------------------------------------|
| id           | UUID         | PK                                    |
| issue_id     | UUID         | NOT NULL, FK → issues.id ON DELETE CASCADE |
| user_id      | UUID         | NOT NULL, FK → users.id ON DELETE CASCADE |
| role         | VARCHAR(50)  | NOT NULL, CHECK(role IN ('complainant','respondent','third_party')) |
| status       | VARCHAR(50)  | NOT NULL, DEFAULT 'active', CHECK(status IN ('active','removed','replaced')) |
| joined_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| metadata     | JSONB        | NULLABLE                             |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version      | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted   | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_participants_issue_id` ON issue_id
- `ix_participants_user_id` ON user_id
- `ix_participants_role` ON role
- UNIQUE(issue_id, user_id) — a user can join an issue only once

**Constraints:**
- An issue must have exactly 1 complainant and exactly 1 respondent.
- An issue can have 0 or more third parties.
- CHECK that if role=complainant, the user_id must match issues.complainant_id.

#### 4.3.4 `submissions`

| Column          | Type         | Constraints                          |
|-----------------|--------------|---------------------------------------|
| id              | UUID         | PK                                    |
| issue_id        | UUID         | NOT NULL, FK → issues.id ON DELETE CASCADE |
| participant_id  | UUID         | NOT NULL, FK → participants.id ON DELETE CASCADE |
| submission_type | VARCHAR(50)  | NOT NULL, CHECK(submission_type IN ('issue_description','legal_basis','requested_remedy','defense','legal_argument','requested_outcome','trade_interest','position','supporting_argument','other')) |
| content         | JSONB        | NOT NULL                             |
| status          | VARCHAR(50)  | NOT NULL, DEFAULT 'draft', CHECK(status IN ('draft','submitted','accepted','revision_requested')) |
| submitted_at    | TIMESTAMPTZ  | NULLABLE                             |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version         | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted      | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_submissions_issue_id` ON issue_id
- `ix_submissions_participant_id` ON participant_id
- `ix_submissions_submission_type` ON submission_type
- `ix_submissions_status` ON status
- UNIQUE(issue_id, participant_id, submission_type, version) — one submission per type per participant per version
- Full-text search GIN index: `ix_submissions_fts` ON to_tsvector('english', content->>'body' || ' ' || COALESCE(content->>'title', ''))

**Notes:**
- `content` is a JSONB object that varies by submission_type. All types share: `{ "title": str, "body": str }`. Additional fields per type are defined in the schema validation layer.

#### 4.3.5 `evidence`

| Column          | Type         | Constraints                          |
|-----------------|--------------|---------------------------------------|
| id              | UUID         | PK                                    |
| issue_id        | UUID         | NOT NULL, FK → issues.id ON DELETE CASCADE |
| participant_id  | UUID         | NOT NULL, FK → participants.id ON DELETE CASCADE |
| file_url        | VARCHAR(1024)| NOT NULL                             |
| file_type       | VARCHAR(100) | NOT NULL                             |
| file_size       | BIGINT       | NOT NULL                             |
| description     | TEXT         | NULLABLE                             |
| storage_path    | VARCHAR(512) | NOT NULL                             |
| status          | VARCHAR(50)  | NOT NULL, DEFAULT 'pending', CHECK(status IN ('pending','validated','rejected')) |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version         | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted      | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_evidence_issue_id` ON issue_id
- `ix_evidence_participant_id` ON participant_id
- `ix_evidence_file_type` ON file_type
- `ix_evidence_status` ON status
- Full-text search GIN index: `ix_evidence_fts` ON to_tsvector('english', COALESCE(description, ''))

#### 4.3.6 `ai_reports`

| Column            | Type         | Constraints                          |
|-------------------|--------------|---------------------------------------|
| id                | UUID         | PK                                    |
| issue_id          | UUID         | NOT NULL, FK → issues.id ON DELETE CASCADE |
| version           | INTEGER      | NOT NULL, DEFAULT 1                   |
| content           | JSONB        | NOT NULL                             |
| confidence_score  | DECIMAL(4,3) | NULLABLE, CHECK(confidence_score >= 0 AND confidence_score <= 1) |
| executive_summary | TEXT         | NULLABLE                             |
| status            | VARCHAR(50)  | NOT NULL, DEFAULT 'draft', CHECK(status IN ('generating','draft','eb_review','fact_checking','finalizing','published','archived')) |
| generated_by      | UUID         | NULLABLE, FK → users.id ON DELETE SET NULL |
| published_url     | VARCHAR(512) | NULLABLE                             |
| metadata          | JSONB        | NULLABLE                             |
| created_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at        | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| is_deleted        | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_ai_reports_issue_id` ON issue_id
- `ix_ai_reports_status` ON status
- UNIQUE(issue_id, version)

**Notes:**
- Each new AI report generation increments version per issue.
- `content` stores the full structured report as JSONB: `{ sections: [], findings: [], citations: [], conclusions: [] }`.

#### 4.3.7 `fact_checks`

| Column           | Type         | Constraints                          |
|------------------|--------------|---------------------------------------|
| id               | UUID         | PK                                    |
| ai_report_id     | UUID         | NOT NULL, FK → ai_reports.id ON DELETE CASCADE |
| participant_id   | UUID         | NOT NULL, FK → participants.id ON DELETE CASCADE |
| status           | VARCHAR(50)  | NOT NULL, DEFAULT 'pending', CHECK(status IN ('pending','approved','correction_requested')) |
| comments         | JSONB        | NULLABLE, DEFAULT '[]'               |
| reviewed_at      | TIMESTAMPTZ  | NULLABLE                             |
| created_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| updated_at       | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| version          | INTEGER      | NOT NULL, DEFAULT 1                  |
| is_deleted       | BOOLEAN      | NOT NULL, DEFAULT FALSE              |

**Indexes:**
- `ix_fact_checks_ai_report_id` ON ai_report_id
- `ix_fact_checks_participant_id` ON participant_id
- `ix_fact_checks_status` ON status
- UNIQUE(ai_report_id, participant_id)

**Notes:**
- `comments` stores an array of `{ section, comment_text, created_by, created_at }` objects.

#### 4.3.8 `revisions`

| Column        | Type         | Constraints                          |
|---------------|--------------|---------------------------------------|
| id            | UUID         | PK                                    |
| revisable_type| VARCHAR(50)  | NOT NULL, CHECK(revisable_type IN ('issue','submission','evidence','ai_report','published_report')) |
| revisable_id  | UUID         | NOT NULL                             |
| version       | INTEGER      | NOT NULL                             |
| changes       | JSONB        | NOT NULL                             |
| created_by    | UUID         | NOT NULL, FK → users.id ON DELETE CASCADE |
| reason        | VARCHAR(500) | NULLABLE                             |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |

**Indexes:**
- `ix_revisions_revisable` ON (revisable_type, revisable_id)
- `ix_revisions_created_by` ON created_by
- `ix_revisions_created_at` ON created_at DESC

**Notes:**
- This is a polymorphic table. `revisable_type + revisable_id` references any of the versioned entities.
- `changes` stores a JSONB diff: `{ "before": {...}, "after": {...}, "changed_fields": [...] }`.
- Revision numbering follows the pattern: `{entity_type}/{entity_id}/v{version}` (e.g., `issue/a1b2c3d4/v3`).

#### 4.3.9 `notifications`

| Column     | Type         | Constraints                          |
|------------|--------------|---------------------------------------|
| id         | UUID         | PK                                    |
| user_id    | UUID         | NOT NULL, FK → users.id ON DELETE CASCADE |
| type       | VARCHAR(100) | NOT NULL                             |
| content    | JSONB        | NOT NULL                             |
| read_at    | TIMESTAMPTZ  | NULLABLE                             |
| created_at | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |

**Indexes:**
- `ix_notifications_user_id` ON user_id
- `ix_notifications_read_at` ON (user_id, read_at) WHERE read_at IS NULL
- `ix_notifications_created_at` ON created_at DESC

**Notes:**
- `type` values: `issue_status_change`, `submission_received`, `report_generated`, `fact_check_requested`, `correction_submitted`, `report_published`, `participant_joined`, `general`.
- `content` example: `{ "title": "Fact Check Requested", "body": "The AI report for DSB-2026-001 is ready for your review.", "action_url": "/issues/...", "metadata": {} }`.

#### 4.3.10 `audit_logs`

| Column       | Type         | Constraints                          |
|--------------|--------------|---------------------------------------|
| id           | UUID         | PK                                    |
| user_id      | UUID         | NULLABLE, FK → users.id ON DELETE SET NULL |
| action       | VARCHAR(255) | NOT NULL                             |
| resource_type| VARCHAR(100) | NOT NULL                             |
| resource_id  | UUID         | NULLABLE                             |
| details      | JSONB        | NULLABLE, DEFAULT '{}'               |
| ip_address   | INET         | NULLABLE                             |
| user_agent   | VARCHAR(512) | NULLABLE                             |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |

**Indexes:**
- `ix_audit_logs_user_id` ON user_id
- `ix_audit_logs_action` ON action
- `ix_audit_logs_resource` ON (resource_type, resource_id)
- `ix_audit_logs_created_at` ON created_at DESC

**Notes:**
- `action` uses the pattern `{verb}_{noun}` e.g., `create_issue`, `update_submission`, `delete_evidence`, `approve_report`.
- This table is append-only (no updates, no deletes).

#### 4.3.11 `sessions`

| Column        | Type         | Constraints                          |
|---------------|--------------|---------------------------------------|
| id            | UUID         | PK                                    |
| user_id       | UUID         | NOT NULL, FK → users.id ON DELETE CASCADE |
| supabase_sid  | VARCHAR(255) | NOT NULL, UNIQUE                     |
| ip_address    | INET         | NULLABLE                             |
| user_agent    | VARCHAR(512) | NULLABLE                             |
| last_active_at| TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |
| expires_at    | TIMESTAMPTZ  | NOT NULL                             |
| created_at    | TIMESTAMPTZ  | NOT NULL, DEFAULT now()              |

**Indexes:**
- `ix_sessions_user_id` ON user_id
- `ix_sessions_supabase_sid` ON supabase_sid (UNIQUE)
- `ix_sessions_expires_at` ON expires_at WHERE expires_at < now()

**Notes:**
- `supabase_sid` links to Supabase Auth session ID for session invalidation.

### 4.4 Migration Strategy

- Alembic manages all schema changes.
- Naming convention for migrations: `{yyyy}_{mm}_{dd}_{seq}_{description}.py`.
- Each migration must be reversible (upgrade + downgrade).
- Seed data migrations for initial enum values and test data are placed in `/alembic/versions/`.

### 4.5 Full-Text Search Configuration

```sql
-- GIN indexes are created via Alembic migrations:
CREATE INDEX ix_issues_fts ON issues USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX ix_submissions_fts ON submissions USING GIN (to_tsvector('english', content->>'body'));
CREATE INDEX ix_evidence_fts ON evidence USING GIN (to_tsvector('english', COALESCE(description, '')));
```

Queries use `ts_query('english', :search_term)` with `@@` operator, ranked by `ts_rank()`.

---

## 5. API Design

### 5.1 Base Configuration

- **Base URL:** `/api/v1`
- **Authentication:** JWT Bearer token from Supabase Auth (`Authorization: Bearer <token>`)
- **Content-Type:** `application/json` for all requests and responses
- **File uploads:** `multipart/form-data`

### 5.2 Standard Response Envelope

**Success (single resource):**
```json
{
  "data": { ... },
  "error": null
}
```

**Success (list with pagination):**
```json
{
  "data": [ ... ],
  "error": null,
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 145,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

**Error:**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": [
      {
        "field": "title",
        "message": "Field required"
      }
    ]
  }
}
```

### 5.3 Status Code Map

| Code | Description            | When                                      |
|------|------------------------|-------------------------------------------|
| 200  | OK                     | Successful GET, PATCH                     |
| 201  | Created                | Successful POST                           |
| 204  | No Content             | Successful DELETE                         |
| 400  | Bad Request            | Validation error, malformed payload       |
| 401  | Unauthorized           | Missing or invalid JWT                    |
| 403  | Forbidden              | Valid JWT but insufficient role           |
| 404  | Not Found              | Resource does not exist                   |
| 409  | Conflict               | Duplicate resource, state conflict        |
| 422  | Unprocessable Entity   | Business rule violation                   |
| 429  | Too Many Requests      | Rate limit exceeded                       |
| 500  | Internal Server Error  | Unhandled exception                       |

### 5.4 Authentication Endpoints

#### `POST /api/v1/auth/signup`

Register a new user (creates Supabase Auth user + platform user record).

**Request:**
```json
{
  "email": "delegate@mission.gov",
  "password": "securePassword123!",
  "display_name": "Delegate Name",
  "role": "delegate"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "email": "delegate@mission.gov",
    "display_name": "Delegate Name",
    "role": "delegate",
    "is_active": true,
    "created_at": "2026-07-08T10:00:00Z"
  },
  "error": null
}
```

#### `POST /api/v1/auth/login`

Authenticate via Supabase Auth.

**Request:**
```json
{
  "email": "delegate@mission.gov",
  "password": "securePassword123!"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "jwt...",
    "refresh_token": "jwt...",
    "expires_at": 1720435200,
    "user": { ... }
  },
  "error": null
}
```

#### `POST /api/v1/auth/refresh`

Refresh an expired access token.

**Request:**
```json
{
  "refresh_token": "jwt..."
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "jwt...",
    "refresh_token": "jwt...",
    "expires_at": 1720438800
  },
  "error": null
}
```

#### `POST /api/v1/auth/logout`

Invalidate session.

**Response (204):** No content.

### 5.5 Health Endpoint

#### `GET /api/v1/health`

No authentication required.

**Response (200):**
```json
{
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-07-08T10:00:00Z",
    "checks": {
      "database": "connected",
      "redis": "connected",
      "storage": "connected"
    },
    "uptime_seconds": 3600
  },
  "error": null
}
```

### 5.6 User Endpoints

Authentication required for all user endpoints.

#### `GET /api/v1/users/me`

Returns the current authenticated user's profile.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "delegate@mission.gov",
    "display_name": "Delegate Name",
    "avatar_url": "https://...",
    "role": "delegate",
    "is_active": true,
    "last_login_at": "2026-07-08T09:00:00Z",
    "created_at": "2026-07-01T10:00:00Z"
  },
  "error": null
}
```

#### `PATCH /api/v1/users/me`

Update current user's profile.

**Request:**
```json
{
  "display_name": "Updated Name",
  "avatar_url": "https://..."
}
```

**Response (200):**
```json
{
  "data": { ... },
  "error": null
}
```

### 5.7 Issue Endpoints

Authentication required.

#### `GET /api/v1/issues`

List issues with pagination, filtering, and search.

**Query Parameters:**
- `page` (int, default 1)
- `per_page` (int, default 20, max 100)
- `status` (string, optional, filter by current_status)
- `search` (string, optional, full-text search)
- `sort_by` (string, default `created_at`, allowed: `created_at`, `updated_at`, `issue_number`)
- `sort_order` (string, default `desc`, allowed: `asc`, `desc`)
- `date_from` (ISO datetime, optional)
- `date_to` (ISO datetime, optional)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "issue_number": "DSB-2026-001",
      "title": "Trade Barrier on Steel Imports",
      "current_status": "submitted",
      "complainant": {
        "id": "uuid",
        "display_name": "Country A"
      },
      "created_at": "2026-07-01T10:00:00Z",
      "updated_at": "2026-07-05T14:00:00Z"
    }
  ],
  "error": null,
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

#### `POST /api/v1/issues`

Create a new issue (draft status).

**Request:**
```json
{
  "title": "Trade Barrier on Steel Imports",
  "description": "Country A alleges that Country B has imposed...",
  "respondent_id": "uuid"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "issue_number": "DSB-2026-001",
    "title": "Trade Barrier on Steel Imports",
    "description": "Country A alleges that Country B has imposed...",
    "complainant_id": "uuid",
    "current_status": "draft",
    "timeline": [
      {
        "status": "draft",
        "timestamp": "2026-07-08T10:00:00Z",
        "changed_by": "uuid"
      }
    ],
    "created_at": "2026-07-08T10:00:00Z",
    "version": 1
  },
  "error": null
}
```

**Notes:**
- The authenticated user becomes the complainant.
- A participant record with role `complainant` is auto-created.
- The specified `respondent_id` gets a participant record with role `respondent`.

#### `GET /api/v1/issues/{issue_id}`

Retrieve an issue with all nested resources.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "issue_number": "DSB-2026-001",
    "title": "Trade Barrier on Steel Imports",
    "description": "...",
    "complainant_id": "uuid",
    "current_status": "submitted",
    "timeline": [ ... ],
    "participants": [ ... ],
    "submissions": [ ... ],
    "evidence": [ ... ],
    "ai_reports": [ ... ],
    "created_at": "...",
    "updated_at": "...",
    "version": 3
  },
  "error": null
}
```

#### `PATCH /api/v1/issues/{issue_id}`

Update issue fields. Creates a revision entry.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "data": { ... },
  "error": null
}
```

#### `POST /api/v1/issues/{issue_id}/submit`

Transition issue from `draft` to `submitted`.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "current_status": "submitted",
    "timeline": [ ... ]
  },
  "error": null
}
```

**Business Rules:**
- Only the complainant can submit.
- Issue must be in `draft` status.

#### `POST /api/v1/issues/{issue_id}/transition`

Transition issue to a valid next state.

**Request:**
```json
{
  "target_status": "under_review",
  "reason": "Moving to EB review"
}
```

**Response (200):**
```json
{
  "data": { ... },
  "error": null
}
```

**Valid Transitions (enforced server-side):**
- `draft` → `submitted`
- `submitted` → `under_review` | `rejected`
- `under_review` → `approved` | `rejected`
- `approved` → `published`
- `published` → `registration_open`
- `registration_open` → `registration_closed`
- `registration_closed` → `submission_phase`
- `submission_phase` → `evidence_phase`
- `evidence_phase` → `ai_processing`
- `ai_processing` → `eb_review`
- `eb_review` → `fact_checking`
- `fact_checking` → `final_revision`
- `final_revision` → `final_published`
- `final_published` → `archived`

**Permission Rules:**
- Executive Board can transition any status.
- Delegate (complainant) can transition `draft` → `submitted`.
- Delegates cannot transition beyond `submitted`.

#### `DELETE /api/v1/issues/{issue_id}`

Soft-delete an issue.

**Response (204):**

### 5.8 Participant Endpoints

#### `GET /api/v1/issues/{issue_id}/participants`

List all participants for an issue.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "display_name": "Country A",
      "role": "complainant",
      "status": "active",
      "joined_at": "..."
    }
  ],
  "error": null
}
```

#### `POST /api/v1/issues/{issue_id}/participants`

Join an issue as a delegate.

**Request:**
```json
{
  "role": "third_party"
}
```

**Response (201):**
```json
{
  "data": { ... },
  "error": null
}
```

**Business Rules:**
- Issue must be in `registration_open` status.
- `role` must be `respondent` or `third_party` (complainant is set at issue creation).
- A user cannot join an issue they are already a participant of.
- Once role is set, it cannot be changed without EB approval (enforced in service layer).

#### `PATCH /api/v1/issues/{issue_id}/participants/{participant_id}`

Update participant status (EB only).

**Request:**
```json
{
  "status": "removed"
}
```

**Response (200):**
```json
{
  "data": { ... },
  "error": null
}
```

#### `DELETE /api/v1/issues/{issue_id}/participants/{participant_id}`

Remove participant (soft delete).

**Response (204):**

### 5.9 Submission Endpoints

#### `GET /api/v1/issues/{issue_id}/submissions`

List submissions with optional type filter.

**Query Parameters:**
- `submission_type` (string, optional)
- `participant_id` (UUID, optional)
- `page`, `per_page`

**Response (200):**
```json
{
  "data": [ ... ],
  "error": null,
  "pagination": { ... }
}
```

#### `POST /api/v1/issues/{issue_id}/submissions`

Create a new submission.

**Request:**
```json
{
  "submission_type": "legal_basis",
  "content": {
    "title": "Violation of GATT Article I",
    "body": "Country B's measure violates the Most-Favoured-Nation principle..."
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "issue_id": "uuid",
    "participant_id": "uuid",
    "submission_type": "legal_basis",
    "content": { ... },
    "status": "draft",
    "version": 1,
    "created_at": "..."
  },
  "error": null
}
```

**Business Rules:**
- Only the participant (not other users) can create submissions for themselves.
- Submissions can only be created during `submission_phase`.

#### `PATCH /api/v1/issues/{issue_id}/submissions/{submission_id}`

Update submission draft. Creates a revision.

**Request:**
```json
{
  "content": { "title": "Updated", "body": "..." },
  "reason": "Added additional treaty references"
}
```

**Response (200):** Updated submission.

#### `POST /api/v1/issues/{issue_id}/submissions/{submission_id}/submit`

Submit the final version. Locks editing.

**Response (200):**
```json
{
  "data": { ... },
  "error": null
}
```

**Business Rules:**
- After submission, `status` changes to `submitted`.
- Once submitted, further edits require EB approval.
- Submission triggers a notification to the EB.

### 5.10 Evidence Endpoints

#### `GET /api/v1/issues/{issue_id}/evidence`

List evidence files.

**Query Parameters:**
- `participant_id`, `file_type`, `status`, `page`, `per_page`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "file_url": "https://...",
      "file_type": "application/pdf",
      "file_size": 2457600,
      "description": "Annex A - Trade statistics 2025",
      "status": "validated",
      "created_at": "..."
    }
  ],
  "error": null
}
```

#### `POST /api/v1/issues/{issue_id}/evidence`

Upload evidence file.

**Request:** `multipart/form-data`
- `file`: binary file
- `description`: string

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "file_url": "...",
    "file_type": "application/pdf",
    "file_size": 2457600,
    "description": "Annex A - Trade statistics 2025",
    "status": "pending",
    "storage_path": "evidence/{issue_id}/{uuid}.pdf",
    "created_at": "..."
  },
  "error": null
}
```

**Validation Rules:**
- Max file size: 50 MB
- Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File is uploaded to Supabase Storage with a signed URL generated on read.
- Background task (`file_validation`) validates the file (virus scan placeholder).

#### `DELETE /api/v1/issues/{issue_id}/evidence/{evidence_id}`

Soft-delete evidence.

**Response (204):**

### 5.11 AI Report Endpoints

#### `GET /api/v1/issues/{issue_id}/ai-reports`

List AI reports for an issue.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "version": 1,
      "status": "draft",
      "confidence_score": 0.87,
      "executive_summary": "...",
      "created_at": "..."
    }
  ],
  "error": null
}
```

#### `GET /api/v1/issues/{issue_id}/ai-reports/{report_id}`

Get full AI report content.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "issue_id": "uuid",
    "version": 1,
    "content": {
      "sections": [
        {
          "title": "Findings of Fact",
          "body": "...",
          "citations": [ ... ]
        }
      ],
      "findings": [ ... ],
      "citations": [ ... ],
      "conclusions": [ ... ]
    },
    "confidence_score": 0.87,
    "executive_summary": "...",
    "status": "draft"
  },
  "error": null
}
```

#### `PATCH /api/v1/issues/{issue_id}/ai-reports/{report_id}`

Update report content (EB only). Creates a revision.

**Request:**
```json
{
  "content": {
    "sections": [ ... ]
  },
  "reason": "Corrected finding on Article III:4"
}
```

**Response (200):** Updated report.

### 5.12 Fact Check Endpoints

#### `GET /api/v1/issues/{issue_id}/ai-reports/{report_id}/fact-checks`

List fact checks for a report.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "participant_id": "uuid",
      "display_name": "Country A",
      "status": "pending",
      "comments": [],
      "created_at": "..."
    }
  ],
  "error": null
}
```

#### `POST /api/v1/issues/{issue_id}/ai-reports/{report_id}/fact-checks`

Submit a fact check response.

**Request:**
```json
{
  "status": "correction_requested",
  "comments": [
    {
      "section": "Findings of Fact",
      "comment_text": "The tariff rate cited (12.4%) is incorrect. The actual applied rate is 8.2%.",
      "paragraph_reference": "3.2"
    }
  ]
}
```

**Response (201):**
```json
{
  "data": { ... },
  "error": null
}
```

**Business Rules:**
- Only participants of the issue can submit fact checks.
- Fact check is only available during `fact_checking` status.
- Each participant can submit exactly one fact check per report version.

#### `PATCH /api/v1/issues/{issue_id}/ai-reports/{report_id}/fact-checks/{fact_check_id}`

Update fact check (only if status is `pending`).

### 5.13 Notification Endpoints

#### `GET /api/v1/notifications`

List notifications for current user.

**Query Parameters:**
- `unread_only` (boolean, default false)
- `page`, `per_page`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "issue_status_change",
      "content": {
        "title": "Issue Submitted",
        "body": "DSB-2026-001 has been submitted for review.",
        "action_url": "/issues/uuid"
      },
      "read_at": null,
      "created_at": "..."
    }
  ],
  "error": null,
  "pagination": { ... }
}
```

#### `POST /api/v1/notifications/{notification_id}/read`

Mark a notification as read.

**Response (200):**
```json
{
  "data": { "read_at": "..." },
  "error": null
}
```

#### `POST /api/v1/notifications/read-all`

Mark all notifications as read for the current user.

**Response (200):**
```json
{
  "data": { "marked_read": 12 },
  "error": null
}
```

### 5.14 Revision Endpoints

#### `GET /api/v1/{resource_type}/{resource_id}/revisions`

List revisions for a given resource.

**Path Parameters:**
- `resource_type`: one of `issues`, `submissions`, `evidence`, `ai-reports`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "revisable_type": "issue",
      "revisable_id": "uuid",
      "version": 3,
      "changes": {
        "before": { "title": "Old Title", "description": "..." },
        "after": { "title": "New Title", "description": "..." },
        "changed_fields": ["title", "description"]
      },
      "created_by": { "id": "uuid", "display_name": "User" },
      "reason": "Updated after EB review",
      "created_at": "..."
    }
  ],
  "error": null
}
```

---

## 6. Service Layer Design

### 6.1 Architecture Pattern

The service layer implements business logic and orchestrates calls across repositories, external services, and background workers. Repositories handle only data access. Services never make direct database calls.

```
API Router → Service → Repository → Database
                 │
                 ├── StorageService (file uploads)
                 ├── AuthService (Supabase Auth)
                 ├── AuditService (logging)
                 └── Background Worker (async tasks)
```

### 6.2 Service Definitions

#### `AuthService`

| Method                   | Purpose                                               |
|--------------------------|-------------------------------------------------------|
| `signup(email, password, display_name, role)` | Creates Supabase Auth user + platform user record |
| `login(email, password)` | Authenticates via Supabase, creates session record    |
| `refresh_token(token)`   | Refreshes JWT via Supabase                            |
| `logout(session_id)`     | Invalidates session in Supabase + local DB            |
| `verify_token(token)`    | Decodes and verifies JWT, returns user                |
| `get_supabase_admin_client()` | Returns Supabase admin client for user management |

#### `UserService`

| Method                    | Purpose                                  |
|---------------------------|------------------------------------------|
| `get_profile(user_id)`    | Fetch full user profile                  |
| `update_profile(user_id, data)` | Update display_name, avatar_url   |
| `deactivate_user(user_id)`| Soft-deactivate user (EB only)           |
| `search_users(query)`     | Search users by name or email            |

#### `IssueService`

| Method                          | Purpose                                       |
|---------------------------------|-----------------------------------------------|
| `create_issue(data, user_id)`   | Create issue + auto-create complainant participant + respondent participant |
| `get_issue(issue_id)`           | Fetch issue with nested resources             |
| `list_issues(filters, pagination)` | Paginated, filtered, searchable listing   |
| `update_issue(issue_id, data, user_id)` | Update fields + create revision      |
| `transition_status(issue_id, target_status, user_id)` | Validate + execute state transition, create timeline entry, create notification |
| `submit_issue(issue_id, user_id)` | Transition draft → submitted              |
| `soft_delete(issue_id)`         | Set is_deleted = TRUE                        |

**State Machine Validation:**
- Each transition is validated against the allowed transition matrix.
- Permissions are checked (EB can do all, delegate only draft→submitted).
- Invalid transitions return 422 with details of the invalid transition attempt.

#### `ParticipantService`

| Method                                | Purpose                                      |
|---------------------------------------|----------------------------------------------|
| `join_issue(issue_id, user_id, role)` | Add participant during registration phase    |
| `list_participants(issue_id)`         | List all participants for an issue           |
| `update_participant(participant_id, data, user_id)` | Change status (EB only) |
| `remove_participant(participant_id)`  | Soft delete participant                      |
| `validate_role_change(participant_id, new_role)` | Check if role change is allowed    |
| `get_participant_by_user_and_issue(user_id, issue_id)` | Find participant record |

#### `SubmissionService`

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `create_submission(issue_id, user_id, data)` | Create submission, validate phase & role  |
| `update_submission(submission_id, data, user_id)` | Update draft + create revision       |
| `submit_submission(submission_id, user_id)`  | Lock submission, notify EB                |
| `list_submissions(issue_id, filters)`        | List with type/participant filtering      |
| `get_submission(submission_id)`              | Fetch single submission                   |
| `validate_submission_content(type, content)` | Pydantic validation of content by type    |

#### `EvidenceService`

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `upload_evidence(issue_id, user_id, file, description)` | Validate file → upload to storage → create record |
| `list_evidence(issue_id, filters)`          | List with file type/status filtering       |
| `get_evidence(evidence_id)`                 | Fetch evidence record + signed URL         |
| `delete_evidence(evidence_id, user_id)`     | Soft delete evidence record               |
| `validate_file(file)`                       | Check MIME type, size, extension           |
| `generate_signed_url(storage_path)`         | Generate time-limited signed URL           |

#### `AIReportService` (scaffold — full implementation in Phase 3)

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `list_reports(issue_id)`                    | List AI reports for issue                  |
| `get_report(report_id)`                     | Fetch report with full content             |
| `update_report(report_id, data, user_id)`   | EB edit report + create revision           |
| `request_generation(issue_id)`              | Queue AI generation job (Phase 3)          |

#### `FactCheckService`

| Method                                                  | Purpose                                  |
|---------------------------------------------------------|------------------------------------------|
| `submit_fact_check(report_id, participant_id, data)`    | Create or update fact check              |
| `list_fact_checks(report_id)`                           | List all fact checks for report          |
| `get_fact_check(fact_check_id)`                         | Fetch single fact check                  |
| `update_fact_check(fact_check_id, data)`                | Update if still pending                  |
| `has_all_participants_approved(report_id)`              | Check if all required approvals received |

#### `NotificationService`

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `create_notification(user_id, type, content)` | Persist notification                     |
| `mark_read(notification_id, user_id)`       | Set read_at timestamp                      |
| `mark_all_read(user_id)`                    | Mark all unread as read                    |
| `list_notifications(user_id, filters)`      | Paginated listing, unread filter           |
| `dispatch_in_app(notification)`             | (Future) WebSocket push                    |

#### `RevisionService`

| Method                                                      | Purpose                                    |
|-------------------------------------------------------------|--------------------------------------------|
| `create_revision(revisable_type, revisable_id, changes, created_by, reason)` | Create revision record   |
| `list_revisions(revisable_type, revisable_id)`              | List all revisions for resource            |
| `get_revision(revision_id)`                                 | Fetch single revision with changes         |
| `get_latest_version(revisable_type, revisable_id)`          | Get current version number                 |

#### `StorageService`

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `upload_file(bucket, path, file, content_type)` | Upload to Supabase Storage              |
| `delete_file(bucket, path)`                 | Delete from storage                        |
| `get_signed_url(bucket, path, expiry_secs)` | Generate signed URL for download           |
| `copy_file(source_bucket, source_path, dest_bucket, dest_path)` | Copy between buckets |
| `list_files(bucket, prefix)`                | List files with prefix                     |

#### `AuditService`

| Method                                      | Purpose                                    |
|---------------------------------------------|--------------------------------------------|
| `log(action, resource_type, resource_id, user_id, details, ip, user_agent)` | Append to audit_logs |
| `query(filters, pagination)`                | Search audit logs (EB only)                |

### 6.3 Dependency Injection Wiring

```python
# app/dependencies.py

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.repositories.issue_repository import IssueRepository
from app.services.issue_service import IssueService

async def get_issue_repository(
    session: AsyncSession = Depends(get_session)
) -> IssueRepository:
    return IssueRepository(session)

async def get_issue_service(
    repo: IssueRepository = Depends(get_issue_repository),
    audit: AuditService = Depends(get_audit_service),
    revision: RevisionService = Depends(get_revision_service),
    notification: NotificationService = Depends(get_notification_service),
) -> IssueService:
    return IssueService(repo, audit, revision, notification)
```

All dependencies are wired via FastAPI's `Depends()` at the router level. This enables unit testing by substituting dependencies with mocks.

---

## 7. Storage Bucket Design

### 7.1 Bucket Definitions

| Bucket Name | Purpose                          | Visibility   | Max File Size | Allowed MIME Types                                  |
|-------------|----------------------------------|--------------|---------------|------------------------------------------------------|
| `evidence`  | Supporting documents and evidence | Private      | 50 MB         | pdf, png, jpeg, doc, docx, txt, xls, xlsx           |
| `reports`   | Generated AI and final reports    | Private      | 20 MB         | pdf                                                |
| `avatars`   | User profile pictures            | Public       | 5 MB          | png, jpeg, webp                                     |

### 7.2 Storage Path Conventions

```
evidence/{issue_id}/{uuid}.{ext}
reports/{issue_id}/v{version}_report.pdf
avatars/{user_id}.{ext}
```

### 7.3 Bucket Policies (Supabase RLs / S3 Bucket Policies)

**`evidence` bucket:**
- Read: Only participants of the issue and EB members can read (via signed URL).
- Write: Only participants of the issue can upload.
- Delete: Only EB members and the uploader can delete.

**`reports` bucket:**
- Read: Participants of the issue and EB members (via signed URL).
- Write: Only the AI service worker account and EB members.
- Delete: Only EB members.

**`avatars` bucket:**
- Read: Public (no auth required).
- Write: Only the authenticated user (their own avatar) and EB members.

### 7.4 File Validation Rules

Executed in `EvidenceService.validate_file()` before upload:

```python
ALLOWED_MIME_TYPES = {
    "evidence": {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    "reports": {"application/pdf"},
    "avatars": {"image/png", "image/jpeg", "image/webp"},
}

MAX_FILE_SIZES = {
    "evidence": 50 * 1024 * 1024,  # 50 MB
    "reports": 20 * 1024 * 1024,   # 20 MB
    "avatars": 5 * 1024 * 1024,    # 5 MB
}
```

**Validation pipeline:**
1. Check file size against MAX_FILE_SIZES[bucket] → 422 if exceeded.
2. Check MIME type (from `file.content_type` + magic bytes inspection) → 422 if not allowed.
3. Check file extension against allowed extensions → 422 if suspicious.
4. Queue background task `file_validation` for virus scan (Phase 1: placeholder that marks as validated; Phase 2+ integrates ClamAV or similar).
5. On background task completion, update `evidence.status` to `validated` or `rejected`.

### 7.5 Signed URL Configuration

- All reads from `evidence` and `reports` buckets go through signed URLs.
- Default expiry: 15 minutes.
- Can be extended to 60 minutes for downloadable reports.
- URLs are generated on-the-fly when the evidence/report is requested via API.
- The `file_url` field in the database is always the signed URL.

---

## 8. Error Handling Strategy

### 8.1 Exception Hierarchy

```python
# app/core/exceptions.py

class AppException(Exception):
    """Base application exception."""
    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."
    details: list | None = None

class NotFoundException(AppException):
    status_code = 404
    code = "NOT_FOUND"

class ValidationException(AppException):
    status_code = 422
    code = "VALIDATION_ERROR"

class ConflictException(AppException):
    status_code = 409
    code = "CONFLICT"

class UnauthorizedException(AppException):
    status_code = 401
    code = "UNAUTHORIZED"

class ForbiddenException(AppException):
    status_code = 403
    code = "FORBIDDEN"

class RateLimitException(AppException):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"

class BusinessRuleException(AppException):
    status_code = 422
    code = "BUSINESS_RULE_VIOLATION"
```

### 8.2 Exception → Response Mapping

Registered in `app/core/error_handlers.py` via FastAPI's `@app.exception_handler`:

| Exception Type                        | HTTP Code | Error Code             |
|---------------------------------------|-----------|------------------------|
| `NotFoundException`                   | 404       | `NOT_FOUND`            |
| `ValidationException`                 | 422       | `VALIDATION_ERROR`     |
| `ConflictException`                   | 409       | `CONFLICT`             |
| `UnauthorizedException`               | 401       | `UNAUTHORIZED`         |
| `ForbiddenException`                  | 403       | `FORBIDDEN`            |
| `RateLimitException`                  | 429       | `RATE_LIMIT_EXCEEDED`  |
| `BusinessRuleException`              | 422       | `BUSINESS_RULE_VIOLATION` |
| `pydantic.ValidationError`            | 422       | `VALIDATION_ERROR`     |
| `sqlalchemy.exc.IntegrityError`      | 409       | `CONFLICT`             |
| `sqlalchemy.exc.DBAPIError`          | 500       | `DATABASE_ERROR`       |
| `jose.JWTError`                       | 401       | `INVALID_TOKEN`        |
| `httpx.HTTPStatusError` (Supabase)    | 502       | `UPSTREAM_ERROR`       |
| Unhandled `Exception`                 | 500       | `INTERNAL_ERROR`       |

### 8.3 Standard Error Response Format

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": [
      {
        "field": "email",
        "message": "value is not a valid email address",
        "code": "email_invalid"
      },
      {
        "field": "password",
        "message": "String should have at least 8 characters",
        "code": "too_short"
      }
    ]
  }
}
```

### 8.4 Logging Strategy

Global middleware captures every request and response:
- Request ID (UUID v4) attached via `structlog` context var.
- Logged fields: `request_id`, `method`, `path`, `status_code`, `duration_ms`, `user_id` (if authenticated), `ip_address`, `user_agent`.
- Errors are logged at ERROR level with full traceback.
- Slow requests (>1000ms) are logged at WARNING level.
- Audit-triggering operations (transitions, deletes, role changes) also log to `audit_logs`.

---

## 9. Acceptance Criteria

### 9.1 Infrastructure

| # | Criterion | Verification |
|---|-----------|--------------|
| 1.1 | FastAPI application starts and serves on configured port | `GET /api/v1/health` returns 200 with all checks green |
| 1.2 | PostgreSQL (Supabase) is reachable | Application connects and runs a test query on startup |
| 1.3 | Redis (Upstash) is reachable | Rate limiter stores and retrieves counters correctly |
| 1.4 | Alembic migrations run successfully | `alembic upgrade head` creates all 11 tables with correct schema |
| 1.5 | Alembic downgrade reverses all changes | `alembic downgrade -1` drops the most recent table cleanly |
| 1.6 | CORS is configured for the frontend origin | Preflight OPTIONS requests return correct CORS headers |
| 1.7 | All environment variables are validated on startup | `AppConfig` raises `ValidationError` if required vars are missing |

### 9.2 Database

| # | Criterion | Verification |
|---|-----------|--------------|
| 2.1 | All 11 tables exist with correct columns | `SELECT * FROM information_schema.columns` matches the schema |
| 2.2 | All PKs are UUID with default generator | `column_default` shows `uuid_generate_v4()` |
| 2.3 | All FKs are defined with correct delete rules | `information_schema.table_constraints` validates |
| 2.4 | All CHECK constraints exist | Test inserts that violate constraints return errors |
| 2.5 | All indexes exist | `pg_indexes` contains all defined indexes |
| 2.6 | Full-text search GIN indexes work | `SELECT * FROM issues WHERE to_tsvector(title || ' ' || description) @@ to_tsquery('steel')` returns results |
| 2.7 | Soft delete works | `is_deleted = TRUE` records are excluded from default queries |
| 2.8 | `created_at` and `updated_at` auto-set | Insert returns correct timestamps |
| 2.9 | Version increments on update | Updating a record increments version by 1 |

### 9.3 API

| # | Criterion | Verification |
|---|-----------|--------------|
| 3.1 | `GET /api/v1/health` returns 200 without auth | Unauthenticated request succeeds |
| 3.2 | Protected endpoints return 401 without JWT | Unauthenticated request to `/api/v1/users/me` returns 401 |
| 3.3 | Protected endpoints return 403 for wrong role | Delegate accessing EB-only endpoint returns 403 |
| 3.4 | User CRUD: signup, login, get profile, update profile work | Full flow test passes |
| 3.5 | Issue CRUD: create, list, get, update, delete work | Full flow test passes |
| 3.6 | Issue state machine enforces valid transitions | Invalid transition returns 422 with `BUSINESS_RULE_VIOLATION` |
| 3.7 | Participant join/rejoin rules are enforced | Duplicate join returns 409 |
| 3.8 | Submission type validation works | Invalid submission_type returns 422 |
| 3.9 | Evidence file validation rejects invalid types | Uploading `.exe` returns 422 |
| 3.10 | Evidence file size limit is enforced | Uploading >50MB returns 422 |
| 3.11 | Pagination works on list endpoints | `?page=2&per_page=5` returns correct slice and pagination metadata |
| 3.12 | Full-text search on issues returns relevant results | `?search=steel` finds matching issues |
| 3.13 | Filtering on status works | `?status=submitted` returns only submitted issues |
| 3.14 | Error responses follow standard format | All errors return `{ data: null, error: { code, message, details } }` |
| 3.15 | Revisions are created on update | Updating an issue creates a revision record |

### 9.4 Storage

| # | Criterion | Verification |
|---|-----------|--------------|
| 4.1 | `evidence` bucket exists and is private | `supabase.storage.get_bucket('evidence')` returns bucket with `public = false` |
| 4.2 | `reports` bucket exists and is private | Same check |
| 4.3 | `avatars` bucket exists and is public | `public = true` |
| 4.4 | File upload stores at correct path | Uploaded file appears at `evidence/{issue_id}/{uuid}.pdf` |
| 4.5 | Signed URL generation works | Generated URL downloads the file within expiry window |
| 4.6 | Signed URL expires correctly | URL returns 403 after expiry |
| 4.7 | File validation queue triggers on upload | Background task `file_validation` is enqueued |
| 4.8 | Storage path convention is enforced | Upload to wrong path is rejected |

### 9.5 Background Workers

| # | Criterion | Verification |
|---|-----------|--------------|
| 5.1 | Arq worker connects to Redis | Worker starts without connection errors |
| 5.2 | Tasks can be enqueued from service layer | `arq_enqueue('file_validation', ...)` succeeds |
| 5.3 | `file_validation` task processes and updates status | Evidence `status` changes from `pending` to `validated` |
| 5.4 | `notification_dispatch` creates notification records | Notification appears in `notifications` table |
| 5.5 | Worker handles failures gracefully | Failed task logs error and does not crash worker |

### 9.6 Observability

| # | Criterion | Verification |
|---|-----------|--------------|
| 6.1 | Structured logging outputs JSON | Log entries are valid JSON with `request_id`, `method`, `path`, `status_code`, `duration_ms` |
| 6.2 | All requests are logged | 100% of requests produce a log line |
| 6.3 | Errors include stack traces | Server errors log full traceback |
| 6.4 | Slow requests are warned | Requests >1000ms log at WARNING |
| 6.5 | Audit logs capture all state transitions | `audit_logs` table has entries for every transition, create, update, delete |

### 9.7 Performance & Security

| # | Criterion | Verification |
|---|-----------|--------------|
| 7.1 | Rate limiting is active | >100 requests/min from same IP returns 429 |
| 7.2 | JWT verification rejects expired tokens | Expired token returns 401 |
| 7.3 | JWT verification rejects tampered tokens | Modified signature returns 401 |
| 7.4 | Password is never returned in responses | `users` endpoint response has no `password` field |
| 7.5 | File upload cannot overwrite existing files | Storage path includes UUID, preventing collisions |
| 7.6 | Pagination max per_page is enforced | `?per_page=200` returns error or caps at 100 |

---

*End of Phase 1 Software Requirements Specification.*

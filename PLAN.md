# ROLE

You are a Senior Software Architect, Technical Lead, Solutions Architect, and AI Systems Engineer.

Your task is NOT to brainstorm.

Your task is to write a complete production-quality Software Requirements Specification (SRS) in Markdown.

This document will become the single source of truth for developers implementing the application.

The audience consists of senior software engineers.

The document should be detailed enough that another engineer could implement the system without asking additional questions.

Write professionally.

Avoid unnecessary explanations.

Do not summarize sections.

Every feature should be fully specified.

The final output should be approximately 15,000–20,000 words.

---

# PROJECT

Title:

WTO Digital Dispute Documentation Platform

This application is NOT a committee management software.

The committee still runs physically.

The application only manages documentation and AI-assisted report generation.

The application is designed specifically for WTO Dispute Settlement Body (DSB) simulations conducted during Model United Nations.

The purpose is to eliminate manual documentation while preserving the committee procedure.

---

# PRIMARY OBJECTIVE

Digitize the lifecycle of a dispute.

The website should manage

• issue submissions
• participant registration
• written statements
• supporting evidence
• AI-generated panel reports
• executive board review
• party fact checking
• publication of final reports

Nothing related to debate moderation, timers, attendance, speakers list or committee control should be included.

---

# USER ROLES

There are ONLY TWO ROLES.

## Executive Board

Responsibilities

• Review submitted issues

• Approve or reject issues

• Publish issues

• Review AI-generated reports

• Edit reports

• Send reports for fact checking

• Review correction requests

• Publish final reports

• Archive disputes

The Executive Board DOES NOT control debate.

The Executive Board DOES NOT manage committee sessions.

---

## Delegate

Delegates can

Raise an issue

Join an issue

A delegate joining an issue must choose ONE role

• Respondent

OR

• Third Party

Once chosen the role cannot be changed without Executive Board approval.

Delegates can

Submit

• written statements

• legal arguments

• requested remedies

• evidence

• supporting documents

Delegates can participate in fact checking after the AI report is generated.

Delegates cannot edit reports.

Delegates cannot moderate anything.

---

# ISSUE LIFECYCLE

Every issue moves through the following state machine.

Draft

↓

Submitted

↓

Executive Board Review

↓

Rejected

OR

Approved

↓

Published

↓

Open for Participant Registration

↓

Registration Closed

↓

Written Submission Phase

↓

Evidence Submission Phase

↓

AI Processing

↓

Executive Board Review

↓

Fact Checking

↓

Executive Board Final Revision

↓

Published

↓

Archived

Create an extremely detailed state diagram.

Explain transitions.

Explain permissions.

Explain invalid transitions.

---

# ISSUE MODEL

Every issue contains

Issue Number

Title

Description

Complainant

Respondent

Third Parties

Current Status

Timeline

Evidence

Submissions

AI Reports

Revision History

Published Report

Every field must be documented.

---

# SUBMISSION FLOW

Complainant submits

Issue Description

Legal Basis

Requested Remedy

Supporting Evidence

Respondent submits

Defense

Legal Arguments

Evidence

Requested Outcome

Third Parties submit

Trade Interest

Position

Supporting Arguments

Evidence

Everything becomes structured data.

Nothing should be stored only as documents.

---

# AI SYSTEM

This is the most important component.

The AI should NOT simply summarize submissions.

The AI pipeline should

Collect

↓

Normalize

↓

Extract structured facts

↓

Retrieve current WTO information

↓

Compare submitted claims with publicly available information

↓

Identify contradictions

↓

Identify missing information

↓

Generate structured WTO panel report

↓

Generate citations

↓

Generate confidence score

↓

Generate executive summary

↓

Produce editable report

Describe

Prompt engineering

Context construction

Chunking

Retrieval

Versioning

Human review

Confidence scoring

Caching

Rate limiting

Background processing

Error recovery

Token optimization

Future RAG integration

Everything.

---

# FACT CHECKING

After Executive Board review

The report is sent to

Complainant

Respondent

Third Parties

Each participant can

Approve

Request Correction

Comment

Corrections create revisions.

Nothing is overwritten.

Everything must be versioned.

---

# VERSIONING

Nothing in the system is mutable.

Everything creates revisions.

Issue

Submission

Evidence

AI Report

Published Report

All revisions must be documented.

Include revision numbering strategy.

---

# DATABASE

Design a complete relational database.

Include

Users

Issues

Participants

Submissions

Evidence

AI Reports

Fact Checks

Revisions

Notifications

Audit Logs

Sessions

Storage

Every table should include

Columns

Relationships

Indexes

Constraints

Delete rules

---

# API DESIGN

Design a REST API.

Include endpoints.

Authentication.

Validation.

Responses.

Status codes.

Error handling.

Pagination.

Filtering.

Searching.

---

# AUTHENTICATION

Use Supabase Auth.

RBAC.

JWT.

Session management.

Protected routes.

---

# STORAGE

Supabase Storage.

Evidence.

Generated reports.

PDFs.

Versioned documents.

---

# SEARCH

Postgres Full Text Search.

Issue search.

Evidence search.

Submission search.

---

# FRONTEND

Next.js

TypeScript

Tailwind

shadcn/ui

React Hook Form

TanStack Query

Explain folder structure.

Explain routing.

Explain component hierarchy.

Explain state management.

Explain error handling.

Explain loading states.

Explain optimistic updates.

---

# BACKEND

FastAPI

SQLAlchemy

Alembic

Supabase

Redis

Background Workers

Dependency Injection

Repository Pattern

Service Layer

Validation

Structured logging

Explain architecture in detail.

---

# DEPLOYMENT

Frontend

Vercel

Backend

Railway or Fly.io

Database

Supabase

Redis

Upstash

Storage

Supabase Storage

Generate deployment architecture diagrams.

Explain CI/CD.

Environment variables.

Secrets.

Backups.

Monitoring.

---

# NON FUNCTIONAL REQUIREMENTS

Support

100 concurrent users.

Maximum response time.

Availability.

Security.

Accessibility.

Scalability.

Maintainability.

Extensibility.

Disaster recovery.

Observability.

Logging.

Metrics.

Tracing.

---

# SECURITY

RBAC

Encryption

Signed URLs

Rate limiting

Audit logs

OWASP recommendations

File validation

Input sanitization

Prompt injection prevention

AI abuse prevention

---

# DIAGRAMS

Generate Mermaid diagrams for

System Architecture

Database Relationships

State Machine

Sequence Diagram

Deployment Architecture

Authentication Flow

Submission Flow

AI Pipeline

Version Flow

Component Diagram

Folder Structure

---

# DOCUMENT STYLE

Write this like a professional software architecture document.

No fluff.

No placeholders.

No TODOs.

No example code unless necessary.

Use Markdown.

Use Mermaid.

Every section should be implementation ready.

The document should exceed 15,000 words.go 
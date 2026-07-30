import {
  boolean,
  integer,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Lean WTO dispute workflow. The legacy tables above remain for migration safety,
// while all new application paths use the normalized tables below.
export const wtoCountries = pgTable("wto_countries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const countryAssignments = pgTable("country_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id").notNull().unique().references(() => wtoCountries.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [index("country_assignments_assigned_by_idx").on(t.assignedBy)]);

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeNumber: text("dispute_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending_eb_review"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("disputes_status_updated_idx").on(t.status, t.updatedAt), index("disputes_created_by_idx").on(t.createdBy)]);

export const disputeParties = pgTable("dispute_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  countryAssignmentId: uuid("country_assignment_id").notNull().references(() => countryAssignments.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("dispute_party_unique_idx").on(t.disputeId, t.countryAssignmentId), uniqueIndex("dispute_party_role_idx").on(t.disputeId, t.role), index("dispute_party_assignment_idx").on(t.countryAssignmentId)]);

export const thirdPartyResponses = pgTable("third_party_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  countryAssignmentId: uuid("country_assignment_id").notNull().references(() => countryAssignments.id, { onDelete: "cascade" }),
  response: text("response").notNull(),
  respondedAt: timestamp("responded_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("third_party_response_unique_idx").on(t.disputeId, t.countryAssignmentId), uniqueIndex("third_party_response_status_idx").on(t.disputeId, t.response), index("third_party_response_assignment_idx").on(t.countryAssignmentId)]);

export const disputeStatements = pgTable("dispute_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputePartyId: uuid("dispute_party_id").notNull().unique().references(() => disputeParties.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  submittedAt: timestamp("submitted_at", { mode: "string" }).defaultNow().notNull(),
});

export const finalReports = pgTable("final_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").notNull().unique().references(() => disputes.id, { onDelete: "cascade" }),
  content: text("content"),
  externalUrl: text("external_url"),
  publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [index("final_reports_published_by_idx").on(t.publishedBy)]);

export const finalReportFiles = pgTable("final_report_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => finalReports.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [index("final_report_files_report_idx").on(t.reportId)]);

export const disputeAuditEvents = pgTable("dispute_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  detail: jsonb("detail").default("{}"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("dispute_audit_events_dispute_idx").on(t.disputeId, t.createdAt), index("dispute_audit_events_actor_idx").on(t.actorId)]);

export const rateLimitEvents = pgTable("rate_limit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyHash: text("key_hash").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("rate_limit_events_lookup_idx").on(t.action, t.keyHash, t.createdAt)]);

export const securityAuditEvents = pgTable("security_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  detail: jsonb("detail").default("{}"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [uniqueIndex("security_audit_events_lookup_idx").on(t.action, t.createdAt), index("security_audit_events_actor_idx").on(t.actorId)]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  supabaseId: text().notNull().unique(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
  country: text(),
  avatarUrl: text(),
  role: text().notNull(),
  isActive: boolean().default(true),
  lastLoginAt: timestamp({ mode: "string" }),
  metadata: jsonb().default("{}"),
});

export const issues = pgTable("issues", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  issueNumber: text().notNull().unique(),
  title: text().notNull(),
  description: text(),
  complainantId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStatus: text().notNull().default("draft"),
  timeline: jsonb().default("[]"),
  publishedReportUrl: text(),
  metadata: jsonb().default("{}"),
});

export const participants = pgTable(
  "participants",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    issueId: uuid()
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text().notNull(),
    status: text().notNull().default("active"),
    joinedAt: timestamp({ mode: "string" }).notNull(),
    metadata: jsonb().default("{}"),
  },
  (t) => [unique().on(t.issueId, t.userId)],
);

export const submissions = pgTable("submissions", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  issueId: uuid()
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  participantId: uuid()
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  submissionType: text().notNull(),
  content: jsonb().default("{}"),
  status: text().notNull().default("draft"),
  submittedAt: timestamp({ mode: "string" }),
});

export const evidence = pgTable("evidence", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  issueId: uuid()
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  participantId: uuid()
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  fileUrl: text().notNull(),
  fileType: text().notNull(),
  fileSize: integer().notNull(),
  description: text(),
  storagePath: text().notNull(),
  status: text().notNull().default("pending"),
});

export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    issueId: uuid()
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    version: integer().notNull().default(1),
    content: jsonb().default("{}"),
    confidenceScore: numeric({ precision: 4, scale: 3 }),
    executiveSummary: text(),
    status: text().notNull().default("draft"),
    generatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    publishedUrl: text(),
    metadata: jsonb().default("{}"),
  },
  (t) => [unique().on(t.issueId, t.version)],
);

export const factChecks = pgTable(
  "fact_checks",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    aiReportId: uuid()
      .notNull()
      .references(() => aiReports.id, { onDelete: "cascade" }),
    participantId: uuid()
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    status: text().notNull().default("pending"),
    comments: jsonb().default("[]"),
    reviewedAt: timestamp({ mode: "string" }),
  },
  (t) => [unique().on(t.aiReportId, t.participantId)],
);

export const revisions = pgTable("revisions", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  revisableType: text().notNull(),
  revisableId: uuid().notNull(),
  version: integer().notNull(),
  changes: jsonb().default("{}"),
  createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
  reason: text(),
});

export const notifications = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text().notNull(),
  content: jsonb().default("{}"),
  readAt: timestamp({ mode: "string" }),
});

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  supabaseSid: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  lastActiveAt: timestamp({ mode: "string" }).notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull(),
});

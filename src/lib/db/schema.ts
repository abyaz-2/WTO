import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  supabaseId: text().notNull().unique(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
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
    .references(() => users.id),
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
      .references(() => issues.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
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
    .references(() => issues.id),
  participantId: uuid()
    .notNull()
    .references(() => participants.id),
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
    .references(() => issues.id),
  participantId: uuid()
    .notNull()
    .references(() => participants.id),
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
      .references(() => issues.id),
    version: integer().notNull().default(1),
    content: jsonb().default("{}"),
    confidenceScore: numeric({ precision: 4, scale: 3 }),
    executiveSummary: text(),
    status: text().notNull().default("generating"),
    generatedBy: uuid().references(() => users.id),
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
      .references(() => aiReports.id),
    participantId: uuid()
      .notNull()
      .references(() => participants.id),
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
  createdBy: uuid().references(() => users.id),
  reason: text(),
});

export const notifications = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  type: text().notNull(),
  content: jsonb().default("{}"),
  readAt: timestamp({ mode: "string" }),
});

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  supabaseSid: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  lastActiveAt: timestamp({ mode: "string" }).notNull(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull(),
});

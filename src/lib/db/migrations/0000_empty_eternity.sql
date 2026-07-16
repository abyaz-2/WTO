CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"issueId" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" jsonb DEFAULT '{}',
	"confidenceScore" numeric(4, 3),
	"executiveSummary" text,
	"status" text DEFAULT 'generating' NOT NULL,
	"generatedBy" uuid,
	"publishedUrl" text,
	"metadata" jsonb DEFAULT '{}',
	CONSTRAINT "ai_reports_issueId_version_unique" UNIQUE("issueId","version")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"issueId" uuid NOT NULL,
	"participantId" uuid NOT NULL,
	"fileUrl" text NOT NULL,
	"fileType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"description" text,
	"storagePath" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"aiReportId" uuid NOT NULL,
	"participantId" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"comments" jsonb DEFAULT '[]',
	"reviewedAt" timestamp,
	CONSTRAINT "fact_checks_aiReportId_participantId_unique" UNIQUE("aiReportId","participantId")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"issueNumber" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"complainantId" uuid NOT NULL,
	"currentStatus" text DEFAULT 'draft' NOT NULL,
	"timeline" jsonb DEFAULT '[]',
	"publishedReportUrl" text,
	"metadata" jsonb DEFAULT '{}',
	CONSTRAINT "issues_issueNumber_unique" UNIQUE("issueNumber")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"content" jsonb DEFAULT '{}',
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"issueId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joinedAt" timestamp NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	CONSTRAINT "participants_issueId_userId_unique" UNIQUE("issueId","userId")
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"revisableType" text NOT NULL,
	"revisableId" uuid NOT NULL,
	"version" integer NOT NULL,
	"changes" jsonb DEFAULT '{}',
	"createdBy" uuid,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"supabaseSid" text NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"lastActiveAt" timestamp NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "sessions_supabaseSid_unique" UNIQUE("supabaseSid")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"issueId" uuid NOT NULL,
	"participantId" uuid NOT NULL,
	"submissionType" text NOT NULL,
	"content" jsonb DEFAULT '{}',
	"status" text DEFAULT 'draft' NOT NULL,
	"submittedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"supabaseId" text NOT NULL,
	"email" text NOT NULL,
	"displayName" text NOT NULL,
	"avatarUrl" text,
	"role" text NOT NULL,
	"isActive" boolean DEFAULT true,
	"lastLoginAt" timestamp,
	"metadata" jsonb DEFAULT '{}',
	CONSTRAINT "users_supabaseId_unique" UNIQUE("supabaseId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_generatedBy_users_id_fk" FOREIGN KEY ("generatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_checks" ADD CONSTRAINT "fact_checks_aiReportId_ai_reports_id_fk" FOREIGN KEY ("aiReportId") REFERENCES "public"."ai_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_checks" ADD CONSTRAINT "fact_checks_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_complainantId_users_id_fk" FOREIGN KEY ("complainantId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
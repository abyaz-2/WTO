CREATE TABLE "wto_countries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "sort_order" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "country_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "country_id" uuid NOT NULL UNIQUE REFERENCES "wto_countries"("id"),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id"),
  "assigned_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_number" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "status" text DEFAULT 'pending_eb_review' NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_parties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_id" uuid NOT NULL REFERENCES "disputes"("id"),
  "country_assignment_id" uuid NOT NULL REFERENCES "country_assignments"("id"),
  "role" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "dispute_party_unique" UNIQUE("dispute_id", "country_assignment_id")
);
--> statement-breakpoint
CREATE TABLE "third_party_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_id" uuid NOT NULL REFERENCES "disputes"("id"),
  "country_assignment_id" uuid NOT NULL REFERENCES "country_assignments"("id"),
  "response" text NOT NULL,
  "responded_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "third_party_response_unique" UNIQUE("dispute_id", "country_assignment_id")
);
--> statement-breakpoint
CREATE TABLE "dispute_statements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_party_id" uuid NOT NULL UNIQUE REFERENCES "dispute_parties"("id"),
  "content" text NOT NULL,
  "submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_id" uuid NOT NULL UNIQUE REFERENCES "disputes"("id"),
  "content" text,
  "external_url" text,
  "published_by" uuid NOT NULL REFERENCES "users"("id"),
  "published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "final_report_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL REFERENCES "final_reports"("id"),
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dispute_id" uuid NOT NULL REFERENCES "disputes"("id"),
  "actor_id" uuid REFERENCES "users"("id"),
  "event_type" text NOT NULL,
  "detail" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "disputes_status_updated_idx" ON "disputes" ("status", "updated_at");
CREATE INDEX "dispute_party_role_idx" ON "dispute_parties" ("dispute_id", "role");
CREATE INDEX "third_party_response_status_idx" ON "third_party_responses" ("dispute_id", "response");
CREATE INDEX "dispute_audit_events_dispute_idx" ON "dispute_audit_events" ("dispute_id", "created_at");
--> statement-breakpoint
INSERT INTO "wto_countries" ("name", "sort_order") VALUES
('Arab Republic of Egypt', 1), ('Argentine Republic', 2), ('Canada', 3), ('Commonwealth of Australia', 4), ('Democratic Socialist Republic of Sri Lanka', 5), ('European Union', 6), ('Federal Democratic Republic of Ethiopia', 7), ('Federal Democratic Republic of Nepal', 8), ('Federal Republic of Germany', 9), ('Federal Republic of Nigeria', 10), ('Federative Republic of Brazil', 11), ('Islamic Republic of Iran', 12), ('Islamic Republic of Pakistan', 13), ('Japan', 14), ('Kingdom of Cambodia', 15), ('Kingdom of Morocco', 16), ('Kingdom of Norway', 17), ('Kingdom of Saudi Arabia', 18), ('Kingdom of Thailand', 19), ('Lao People''s Democratic Republic', 20), ('Malaysia', 21), ('New Zealand', 22), ('Oriental Republic of Uruguay', 23), ('People''s Democratic Republic of Algeria', 24), ('People''s Republic of Bangladesh', 25), ('People''s Republic of China', 26), ('Plurinational State of Bolivia', 27), ('Republic of Belarus', 28), ('Republic of Benin', 29), ('Republic of Chile', 30), ('Republic of Colombia', 31), ('Republic of Costa Rica', 32), ('Republic of Ecuador', 33), ('Republic of Ghana', 34), ('Republic of Guatemala', 35), ('Republic of India', 36), ('Republic of Indonesia', 37), ('Republic of Kazakhstan', 38), ('Republic of Kenya', 39), ('Republic of Korea', 40), ('Republic of Malawi', 41), ('Republic of Mozambique', 42), ('Republic of Paraguay', 43), ('Republic of Peru', 44), ('Republic of Rwanda', 45), ('Republic of Senegal', 46), ('Republic of Singapore', 47), ('Republic of South Africa', 48), ('Republic of the Philippines', 49), ('Republic of Türkiye', 50), ('Republic of Uganda', 51), ('Republic of Zambia', 52), ('Republic of Zimbabwe', 53), ('Russian Federation', 54), ('Socialist Republic of Viet Nam', 55), ('Swiss Confederation (Switzerland)', 56), ('United Arab Emirates', 57), ('United Kingdom of Great Britain and Northern Ireland', 58), ('United Mexican States (Mexico)', 59), ('United Republic of Tanzania', 60), ('United States of America', 61);
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public) VALUES ('final-reports', 'final-reports', false) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
ALTER TABLE "wto_countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "country_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispute_parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "third_party_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispute_statements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "final_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "final_report_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dispute_audit_events" ENABLE ROW LEVEL SECURITY;

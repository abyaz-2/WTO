CREATE TABLE "delegate_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "country_assignment_id" uuid NOT NULL UNIQUE REFERENCES "country_assignments"("id") ON DELETE CASCADE,
  "encrypted_secret" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegate_credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP INDEX IF EXISTS "dispute_party_role_idx";
DROP INDEX IF EXISTS "third_party_response_status_idx";
CREATE INDEX "dispute_party_role_idx" ON "dispute_parties" ("dispute_id", "role");
CREATE INDEX "third_party_response_status_idx" ON "third_party_responses" ("dispute_id", "response");

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_status_check" CHECK ("status" IN ('pending_eb_review', 'rejected', 'third_party_response', 'third_party_eb_review', 'statements_open', 'statements_closed', 'final_report_published'));
ALTER TABLE "dispute_parties" ADD CONSTRAINT "dispute_parties_role_check" CHECK ("role" IN ('complainant', 'respondent', 'third_party'));
ALTER TABLE "third_party_responses" ADD CONSTRAINT "third_party_responses_value_check" CHECK ("response" IN ('yes', 'no'));
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_hash" text NOT NULL,
  "action" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "rate_limit_events_lookup_idx" ON "rate_limit_events" ("action", "key_hash", "created_at");
ALTER TABLE "rate_limit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "security_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid REFERENCES "users"("id"),
  "action" text NOT NULL,
  "target_id" text NOT NULL,
  "detail" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "security_audit_events_lookup_idx" ON "security_audit_events" ("action", "created_at");
ALTER TABLE "security_audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_dispute_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'dispute audit events are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER dispute_audit_events_immutable
BEFORE UPDATE OR DELETE ON "dispute_audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_dispute_audit_mutation();
CREATE TRIGGER security_audit_events_immutable
BEFORE UPDATE OR DELETE ON "security_audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_dispute_audit_mutation();

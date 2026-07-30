CREATE INDEX "country_assignments_assigned_by_idx" ON "country_assignments" ("assigned_by");
CREATE INDEX "disputes_created_by_idx" ON "disputes" ("created_by");
CREATE INDEX "dispute_party_assignment_idx" ON "dispute_parties" ("country_assignment_id");
CREATE INDEX "third_party_response_assignment_idx" ON "third_party_responses" ("country_assignment_id");
CREATE INDEX "final_reports_published_by_idx" ON "final_reports" ("published_by");
CREATE INDEX "final_report_files_report_idx" ON "final_report_files" ("report_id");
CREATE INDEX "dispute_audit_events_actor_idx" ON "dispute_audit_events" ("actor_id");
CREATE INDEX "security_audit_events_actor_idx" ON "security_audit_events" ("actor_id");
ALTER FUNCTION public.prevent_dispute_audit_mutation() SET search_path = pg_catalog;

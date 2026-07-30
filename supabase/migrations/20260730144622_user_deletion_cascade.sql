-- A user owns their active workspace records. Historical actor references remain
-- available after deletion, while the user-owned relationship graph is removed.
ALTER TABLE public.country_assignments DROP CONSTRAINT country_assignments_country_id_fkey, DROP CONSTRAINT country_assignments_user_id_fkey, DROP CONSTRAINT country_assignments_assigned_by_fkey;
ALTER TABLE public.country_assignments ADD CONSTRAINT country_assignments_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.wto_countries(id) ON DELETE CASCADE, ADD CONSTRAINT country_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE, ADD CONSTRAINT country_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.disputes DROP CONSTRAINT disputes_created_by_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.dispute_parties DROP CONSTRAINT dispute_parties_dispute_id_fkey, DROP CONSTRAINT dispute_parties_country_assignment_id_fkey;
ALTER TABLE public.dispute_parties ADD CONSTRAINT dispute_parties_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE, ADD CONSTRAINT dispute_parties_country_assignment_id_fkey FOREIGN KEY (country_assignment_id) REFERENCES public.country_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.third_party_responses DROP CONSTRAINT third_party_responses_dispute_id_fkey, DROP CONSTRAINT third_party_responses_country_assignment_id_fkey;
ALTER TABLE public.third_party_responses ADD CONSTRAINT third_party_responses_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE, ADD CONSTRAINT third_party_responses_country_assignment_id_fkey FOREIGN KEY (country_assignment_id) REFERENCES public.country_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.dispute_statements DROP CONSTRAINT dispute_statements_dispute_party_id_fkey;
ALTER TABLE public.dispute_statements ADD CONSTRAINT dispute_statements_dispute_party_id_fkey FOREIGN KEY (dispute_party_id) REFERENCES public.dispute_parties(id) ON DELETE CASCADE;
ALTER TABLE public.final_reports ALTER COLUMN published_by DROP NOT NULL;
ALTER TABLE public.final_reports DROP CONSTRAINT final_reports_dispute_id_fkey, DROP CONSTRAINT final_reports_published_by_fkey;
ALTER TABLE public.final_reports ADD CONSTRAINT final_reports_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE, ADD CONSTRAINT final_reports_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.final_report_files DROP CONSTRAINT final_report_files_report_id_fkey;
ALTER TABLE public.final_report_files ADD CONSTRAINT final_report_files_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.final_reports(id) ON DELETE CASCADE;
ALTER TABLE public.dispute_audit_events ALTER COLUMN dispute_id DROP NOT NULL;
ALTER TABLE public.dispute_audit_events DROP CONSTRAINT dispute_audit_events_dispute_id_fkey, DROP CONSTRAINT dispute_audit_events_actor_id_fkey;
ALTER TABLE public.dispute_audit_events ADD CONSTRAINT dispute_audit_events_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE SET NULL, ADD CONSTRAINT dispute_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.security_audit_events DROP CONSTRAINT security_audit_events_actor_id_fkey;
ALTER TABLE public.security_audit_events ADD CONSTRAINT security_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.issues DROP CONSTRAINT "issues_complainantId_users_id_fk";
ALTER TABLE public.issues ADD CONSTRAINT "issues_complainantId_users_id_fk" FOREIGN KEY ("complainantId") REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.participants DROP CONSTRAINT "participants_issueId_issues_id_fk", DROP CONSTRAINT "participants_userId_users_id_fk";
ALTER TABLE public.participants ADD CONSTRAINT "participants_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES public.issues(id) ON DELETE CASCADE, ADD CONSTRAINT "participants_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.submissions DROP CONSTRAINT "submissions_issueId_issues_id_fk", DROP CONSTRAINT "submissions_participantId_participants_id_fk";
ALTER TABLE public.submissions ADD CONSTRAINT "submissions_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES public.issues(id) ON DELETE CASCADE, ADD CONSTRAINT "submissions_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.evidence DROP CONSTRAINT "evidence_issueId_issues_id_fk", DROP CONSTRAINT "evidence_participantId_participants_id_fk";
ALTER TABLE public.evidence ADD CONSTRAINT "evidence_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES public.issues(id) ON DELETE CASCADE, ADD CONSTRAINT "evidence_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.ai_reports DROP CONSTRAINT "ai_reports_issueId_issues_id_fk", DROP CONSTRAINT "ai_reports_generatedBy_users_id_fk";
ALTER TABLE public.ai_reports ADD CONSTRAINT "ai_reports_issueId_issues_id_fk" FOREIGN KEY ("issueId") REFERENCES public.issues(id) ON DELETE CASCADE, ADD CONSTRAINT "ai_reports_generatedBy_users_id_fk" FOREIGN KEY ("generatedBy") REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.fact_checks DROP CONSTRAINT "fact_checks_aiReportId_ai_reports_id_fk", DROP CONSTRAINT "fact_checks_participantId_participants_id_fk";
ALTER TABLE public.fact_checks ADD CONSTRAINT "fact_checks_aiReportId_ai_reports_id_fk" FOREIGN KEY ("aiReportId") REFERENCES public.ai_reports(id) ON DELETE CASCADE, ADD CONSTRAINT "fact_checks_participantId_participants_id_fk" FOREIGN KEY ("participantId") REFERENCES public.participants(id) ON DELETE CASCADE;
ALTER TABLE public.revisions DROP CONSTRAINT "revisions_createdBy_users_id_fk";
ALTER TABLE public.revisions ADD CONSTRAINT "revisions_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications DROP CONSTRAINT "notifications_userId_users_id_fk";
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.sessions DROP CONSTRAINT "sessions_userId_users_id_fk";
ALTER TABLE public.sessions ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;

-- Preserve immutable audit records, while allowing foreign-key actions to erase
-- deleted entity references.
CREATE OR REPLACE FUNCTION public.prevent_dispute_audit_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND (to_jsonb(OLD) - 'actor_id' - 'dispute_id') = (to_jsonb(NEW) - 'actor_id' - 'dispute_id')
    AND ((to_jsonb(OLD)->>'actor_id' IS NOT NULL AND to_jsonb(NEW)->>'actor_id' IS NULL)
      OR (to_jsonb(OLD)->>'dispute_id' IS NOT NULL AND to_jsonb(NEW)->>'dispute_id' IS NULL)) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit events are append-only';
END;
$$ LANGUAGE plpgsql;

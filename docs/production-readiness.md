# Production Readiness

## Required Supabase configuration

- Disable public email signups in Supabase Auth. Accounts are created only by an Executive Board workflow.
- Keep `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose either through a `NEXT_PUBLIC_` variable.
- Configure a pooled server-only `DATABASE_URL`; use the Supabase anon key only in browser-facing configuration.
- Create the private `final-reports` bucket through the migration; do not add anonymous Storage policies.
- Create initial Executive Board users through Supabase Auth Admin and insert matching active `users` profiles with role `executive_board` before enabling the site.

## Release sequence

1. Back up the Supabase database and run migrations against staging:
   `npx drizzle-kit migrate`.
2. Confirm the 61 seeded countries, no anonymous access to the new tables, and no direct Storage object access.
3. Run the test/build gates: `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
4. Test the full workflow with separate EB and delegate accounts, including rejected disputes, third-party no responses, duplicate statements, report downloads, password reset, and reassignment.
5. Run a 60-user concurrent smoke test: third-party responses, statement submissions, notification fan-out, and two simultaneous EB finalisation attempts.
6. Apply the same migrations to production during the event setup window, provision EB accounts, assign delegate accounts, and download each one-time credential CSV immediately.

## Security acceptance checks

- Public `/api/v1/auth/signup` returns 403.
- A disabled/reassigned user cannot log in, use an API route, or load the dashboard.
- A delegate cannot access another country’s pending dispute data or an unpublished report file.
- The browser has no direct RLS policy for mutation or read access to the new workflow tables.
- Uploaded reports are PDF/DOCX under 10 MB; downloads are signed for 60 seconds only after publication.
- Audit-event rows reject `UPDATE` and `DELETE` at the database level.

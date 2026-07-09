import { requireAuth } from "@/lib/auth";
import NewSubmissionWizard from "./NewSubmissionWizard";

export default async function NewSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  return <NewSubmissionWizard issueId={id} />;
}

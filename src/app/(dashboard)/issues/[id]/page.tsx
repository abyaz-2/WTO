import { requireAuth } from "@/lib/auth";
import IssueDetailClient from "./IssueDetailClient";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  return <IssueDetailClient issueId={id} />;
}

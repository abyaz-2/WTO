import { requireAuth } from "@/lib/auth";
import SubmissionsClient from "./SubmissionsClient";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  return <SubmissionsClient issueId={id} />;
}

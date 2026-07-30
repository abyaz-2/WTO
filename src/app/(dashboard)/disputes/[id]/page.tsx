import { requireAuth } from "@/lib/auth";
import DisputeDetailClient from "./DisputeDetailClient";
export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) { await requireAuth(); return <DisputeDetailClient disputeId={(await params).id} />; }

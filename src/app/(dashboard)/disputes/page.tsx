import { requireAuth } from "@/lib/auth";
import DisputeListClient from "./DisputeListClient";
export default async function DisputesPage() { await requireAuth(); return <DisputeListClient />; }

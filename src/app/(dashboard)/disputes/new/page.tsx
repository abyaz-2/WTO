import { requireAuth } from "@/lib/auth";
import DisputeForm from "./DisputeForm";
export default async function NewDisputePage() { await requireAuth(); return <DisputeForm />; }

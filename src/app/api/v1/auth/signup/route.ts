import { NextRequest } from "next/server";
import { ForbiddenError, handleApiError } from "@/lib/services/errors";

// Delegate and EB accounts are intentionally provisioned server-side by EB only.
export async function POST(request: NextRequest) {
  try {
    void request;
    throw new ForbiddenError("Accounts are provisioned by the Executive Board only");
  } catch (error) {
    return handleApiError(error);
  }
}

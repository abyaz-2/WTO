import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json(apiResponse({ status: "healthy", timestamp: new Date().toISOString() }));
  } catch (error) {
    return Response.json(
      { data: null, error: { code: "UNHEALTHY", message: "Database connection failed" } },
      { status: 503 },
    );
  }
}

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "healthy", timestamp: new Date().toISOString() });
  } catch {
    return Response.json(
      { data: null, error: { code: "UNHEALTHY", message: "Database connection failed" } },
      { status: 503 },
    );
  }
}

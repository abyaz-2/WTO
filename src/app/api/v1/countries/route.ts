import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { countryAssignments, securityAuditEvents, users, wtoCountries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { createUser } from "@/lib/services/user";
import { listCountries } from "@/lib/services/dispute";
import { ConflictError, handleApiError, ValidationError } from "@/lib/services/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function temporaryPassword() {
  return Array.from({ length: 8 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const countries = await listCountries();
    return Response.json(user.role === "executive_board" ? countries : countries.map(({ email: _email, ...country }) => country));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser(request);
    requireEb(actor);
    await enforceRateLimit("country_provision", actor.id, 20, 3600);
    const { countryId, email } = await request.json();
    if (!countryId || typeof email !== "string" || !email.includes("@")) throw new ValidationError("A country and valid email are required");
    const password = temporaryPassword();
    let createdUser: { id: string; supabaseId: string } | undefined;
    let countryName = "";
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${countryId}))`);
        const [country] = await tx.select().from(wtoCountries).where(eq(wtoCountries.id, countryId)).limit(1);
        if (!country) throw new ValidationError("Unknown country");
        countryName = country.name;
        const [existing] = await tx.select().from(countryAssignments).where(eq(countryAssignments.countryId, countryId)).limit(1);
        if (existing) throw new ConflictError("This country already has a delegate assignment");
        const { user } = await createUser({ email: email.trim().toLowerCase(), country: country.name, password, role: "delegate" });
        createdUser = user;
        await tx.insert(countryAssignments).values({ countryId, userId: user.id, assignedBy: actor.id });
        await tx.insert(securityAuditEvents).values({ actorId: actor.id, action: "country_assigned", targetId: countryId, detail: { userId: user.id } });
      });
    } catch (error) {
      if (createdUser) {
        await db.update(users).set({ isActive: false }).where(eq(users.id, createdUser.id)).catch(() => undefined);
        await supabaseAdmin.auth.admin.deleteUser(createdUser.supabaseId).catch(() => undefined);
      }
      throw error;
    }
    return Response.json({ country: countryName, email: email.trim().toLowerCase(), password }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getCurrentUser(request);
    requireEb(actor);
    await enforceRateLimit("country_credential_change", actor.id, 30, 3600);
    const { countryId, email } = await request.json();
    const password = temporaryPassword();
    if (typeof email === "string" && email.trim()) {
      let oldSupabaseId = ""; let countryName = ""; let createdUser: { id: string; supabaseId: string } | undefined;
      try {
        await db.transaction(async (tx) => {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${countryId}))`);
          const [assignment] = await tx.select({ userId: countryAssignments.userId, supabaseId: users.supabaseId, name: wtoCountries.name }).from(countryAssignments).innerJoin(users, eq(countryAssignments.userId, users.id)).innerJoin(wtoCountries, eq(countryAssignments.countryId, wtoCountries.id)).where(eq(countryAssignments.countryId, countryId)).limit(1);
          if (!assignment) throw new ValidationError("This country has no assigned delegate");
          countryName = assignment.name; oldSupabaseId = assignment.supabaseId;
          const { user } = await createUser({ email: email.trim().toLowerCase(), country: assignment.name, password, role: "delegate" });
          createdUser = user;
          await tx.update(users).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(users.id, assignment.userId));
          await tx.update(countryAssignments).set({ userId: user.id, assignedBy: actor.id, updatedAt: new Date().toISOString() }).where(eq(countryAssignments.countryId, countryId));
          await tx.insert(securityAuditEvents).values({ actorId: actor.id, action: "country_reassigned", targetId: countryId, detail: { previousUserId: assignment.userId, userId: user.id } });
        });
      } catch (error) {
        if (createdUser) { await db.update(users).set({ isActive: false }).where(eq(users.id, createdUser.id)).catch(() => undefined); await supabaseAdmin.auth.admin.deleteUser(createdUser.supabaseId).catch(() => undefined); }
        throw error;
      }
      await supabaseAdmin.auth.admin.deleteUser(oldSupabaseId).catch(() => undefined);
      return Response.json({ country: countryName, email: email.trim().toLowerCase(), password });
    }
    const [assignment] = await db.select({ userId: countryAssignments.userId, email: users.email, name: wtoCountries.name }).from(countryAssignments).innerJoin(users, eq(countryAssignments.userId, users.id)).innerJoin(wtoCountries, eq(countryAssignments.countryId, wtoCountries.id)).where(eq(countryAssignments.countryId, countryId)).limit(1);
    if (!assignment) throw new ValidationError("This country has no assigned delegate");
    const { resetUserPassword } = await import("@/lib/services/user");
    await resetUserPassword(assignment.userId, password);
    await db.insert(securityAuditEvents).values({ actorId: actor.id, action: "country_password_reset", targetId: countryId, detail: { userId: assignment.userId } });
    return Response.json({ country: assignment.name, email: assignment.email, password });
  } catch (error) { return handleApiError(error); }
}

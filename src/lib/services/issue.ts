import { supabaseAdmin } from "@/lib/supabase/admin";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/services/errors";
import crypto from "crypto";

export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected", "draft"],
  approved: ["published"],
  published: ["registration_open"],
  registration_open: ["registration_closed"],
  registration_closed: ["submission_phase"],
  submission_phase: ["evidence_phase"],
  evidence_phase: ["eb_review"],
  eb_review: ["fact_checking", "final_published", "draft"],
  fact_checking: ["final_revision", "eb_review"],
  final_revision: ["final_published", "eb_review"],
  final_published: ["archived"],
  rejected: ["draft"],
};

const TRANSITION_PERMISSIONS: Record<string, string> = {
  submitted: "complainant",
  under_review: "eb",
  approved: "eb",
  published: "eb",
  registration_open: "eb",
  registration_closed: "eb",
  submission_phase: "eb",
  evidence_phase: "eb",
  eb_review: "eb",
  fact_checking: "eb",
  final_revision: "eb",
  final_published: "eb",
  rejected: "eb",
  archived: "eb",
};

function toIssueResponse(issue: any) {
  return {
    id: issue.id,
    issue_number: issue.issue_number,
    title: issue.title,
    description: issue.description ?? null,
    complainant_id: issue.complainant_id,
    current_status: issue.current_status,
    timeline: issue.timeline,
    published_report_url: issue.published_report_url ?? null,
    metadata: issue.metadata,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

export async function createIssue(data: { title: string; description?: string; respondentId?: string; coComplainantIds?: string[] }, userId: string) {
  const { count } = await supabaseAdmin.from("issues").select("*", { count: "exact", head: true });
  const nextNumber = (count ?? 0) + 1;
  const issueNumber = `WTO-${String(nextNumber).padStart(4, "0")}`;

  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: "Issue created",
    description: "Issue has been created in draft status",
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const { data: issue, error } = await supabaseAdmin
    .from("issues")
    .insert({
      issue_number: issueNumber,
      title: data.title,
      description: data.description,
      complainant_id: userId,
      current_status: "draft",
      timeline: [timelineEntry],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!issue) throw new Error("Failed to create issue");

  await supabaseAdmin.from("participants").insert({
    issue_id: issue.id,
    user_id: userId,
    role: "complainant",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (data.respondentId) {
    await supabaseAdmin.from("participants").insert({
      issue_id: issue.id,
      user_id: data.respondentId,
      role: "respondent",
      status: "active",
      joined_at: new Date().toISOString(),
    });
  }

  if (data.coComplainantIds?.length) {
    const coComplainants = data.coComplainantIds
      .filter((id) => id !== userId)
      .map((id) => ({
        issue_id: issue.id,
        user_id: id,
        role: "complainant",
        status: "active",
        joined_at: new Date().toISOString(),
      }));
    if (coComplainants.length > 0) {
      await supabaseAdmin.from("participants").insert(coComplainants);
    }
  }

  return toIssueResponse(issue);
}

export async function getIssue(issueId: string) {
  const { data: issue, error } = await supabaseAdmin.from("issues").select("*").eq("id", issueId).single();
  if (error || !issue) throw new NotFoundError("Issue");
  return toIssueResponse(issue);
}

export async function listIssues(
  page: number = 1,
  perPage: number = 20,
  options?: { status?: string; search?: string; userId?: string },
) {
  let query = supabaseAdmin.from("issues").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("current_status", options.status);
  }

  if (options?.userId) {
    query = query.eq("complainant_id", options.userId);
  }

  if (options?.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const offset = (page - 1) * perPage;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;

  return {
    data: (data ?? []).map(toIssueResponse),
    total,
    page,
    page_size: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}

export async function updateIssue(
  issueId: string,
  data: { title?: string; description?: string },
  userId: string,
) {
  const { data: issue } = await supabaseAdmin.from("issues").select("*").eq("id", issueId).single();
  if (!issue) throw new NotFoundError("Issue");

  if (issue.complainant_id !== userId) {
    throw new ForbiddenError("Only the complainant can update this issue");
  }

  if (issue.current_status !== "draft") {
    throw new ValidationError("Issue can only be updated in draft status");
  }

  const changes: Record<string, { old: string; new: string }> = {};

  if (data.title !== undefined && data.title !== issue.title) {
    changes.title = { old: issue.title, new: data.title };
  }

  if (data.description !== undefined && data.description !== (issue.description ?? "")) {
    changes.description = { old: issue.description ?? "", new: data.description };
  }

  if (Object.keys(changes).length > 0) {
    const { data: latestRevision } = await supabaseAdmin
      .from("revisions")
      .select("version")
      .eq("revisable_type", "issue")
      .eq("revisable_id", issueId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestRevision?.version ?? 0) + 1;

    await supabaseAdmin.from("revisions").insert({
      revisable_type: "issue",
      revisable_id: issueId,
      version: nextVersion,
      changes,
      created_by: userId,
    });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  const { data: updated, error } = await supabaseAdmin
    .from("issues")
    .update(updateData)
    .eq("id", issueId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toIssueResponse(updated);
}

export async function transitionStatus(
  issueId: string,
  targetStatus: string,
  userId: string,
  userRole: string,
) {
  const { data: issue } = await supabaseAdmin.from("issues").select("*").eq("id", issueId).single();
  if (!issue) throw new NotFoundError("Issue");

  const currentStatus = issue.current_status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
    throw new ValidationError(
      `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
    );
  }

  const requiredRole = TRANSITION_PERMISSIONS[targetStatus];
  if (!requiredRole) {
    throw new ValidationError(`No permission mapping for target status '${targetStatus}'`);
  }

  if (requiredRole === "complainant") {
    if (issue.complainant_id !== userId) {
      throw new ForbiddenError("Only the complainant can perform this transition");
    }
  } else if (requiredRole === "eb") {
    if (userRole !== "executive_board") {
      throw new ForbiddenError("Only executive board members can perform this transition");
    }
  } else if (requiredRole === "system") {
    throw new ForbiddenError("This transition can only be performed by the system");
  }

  const currentTimeline = (issue.timeline as Array<Record<string, unknown>>) ?? [];
  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: `Status changed from ${currentStatus} to ${targetStatus}`,
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabaseAdmin
    .from("issues")
    .update({
      current_status: targetStatus,
      timeline: [...currentTimeline, timelineEntry],
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toIssueResponse(updated);
}

export async function archiveIssue(issueId: string, userId: string) {
  const { data: issue } = await supabaseAdmin.from("issues").select("*").eq("id", issueId).single();
  if (!issue) throw new NotFoundError("Issue");

  if (issue.current_status === "archived") {
    throw new ValidationError("Issue is already archived");
  }

  const currentTimeline = (issue.timeline as Array<Record<string, unknown>>) ?? [];
  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: "Issue archived",
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabaseAdmin
    .from("issues")
    .update({
      current_status: "archived",
      timeline: [...currentTimeline, timelineEntry],
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toIssueResponse(updated);
}

export async function listArchiveIssues(page: number = 1, perPage: number = 12, search?: string) {
  let query = supabaseAdmin.from("issues").select("*", { count: "exact" }).eq("current_status", "archived");

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data: rows, error, count } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;

  const disputes = await Promise.all(
    (rows ?? []).map(async (issue) => {
      const { data: participantRows } = await supabaseAdmin
        .from("participants")
        .select("user_id, users!inner(display_name)")
        .eq("issue_id", issue.id);

      const timeline = (issue.timeline ?? []) as Array<Record<string, unknown>>;

      const publishedEntry = timeline.find(
        (t) => t.type === "status_change" && (t.title as string)?.includes("to final_published"),
      );
      const archivedEntry = timeline.find(
        (t) => t.type === "status_change" && (t.title as string)?.includes("to archived"),
      );

      return {
        id: issue.id,
        number: issue.issue_number,
        title: issue.title,
        parties: (participantRows ?? []).map((p: any) => p.users?.display_name ?? "Unknown"),
        published_at: (publishedEntry?.created_at as string) ?? issue.created_at,
        archived_at: (archivedEntry?.created_at as string) ?? issue.updated_at,
      };
    }),
  );

  return {
    disputes,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  };
}
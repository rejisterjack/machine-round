import type { PanelistMode } from "@/generated/client";
import { ApiError } from "@/lib/api/errors";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { getInterviewSessionById } from "@/lib/session/persistence";
import { roleSlugToId } from "@/lib/session/role-slug";
import { resolveRole, type RoleDto } from "@/lib/session/roles";
import { assertSessionOwner } from "@/lib/session/session-access";

export type BoundSessionContext = {
  sessionId: string;
  roleId: string;
  roleTitle: string;
  promptContext?: string | null;
  interviewDuration: InterviewDuration;
  panelistMode: PanelistMode;
  weakSignals: string[];
};

export async function getBoundSessionContext(
  sessionId: string,
  userId: string,
): Promise<BoundSessionContext> {
  await assertSessionOwner(sessionId, userId);
  const session = await getInterviewSessionById(sessionId);
  if (!session) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }

  return {
    sessionId: session.id,
    roleId: roleSlugToId(session.role.slug),
    roleTitle: session.role.title,
    promptContext: session.promptContext,
    interviewDuration: session.interviewDuration ?? "minutes_30",
    panelistMode: session.panelistMode ?? "both",
    weakSignals: session.weakSignals,
  };
}

export async function resolveRoleFromSession(
  sessionId: string | undefined,
  userId: string,
  clientHint?: { roleId?: string; roleTitle?: string; role?: string },
): Promise<{ role: RoleDto; bound?: BoundSessionContext }> {
  if (sessionId) {
    const bound = await getBoundSessionContext(sessionId, userId);
    if (
      clientHint?.roleId &&
      clientHint.roleId !== bound.roleId &&
      clientHint.roleId !== "job-custom"
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "roleId does not match this session.",
        400,
      );
    }
    const role = await resolveRole({
      roleId: bound.roleId,
      roleTitle: bound.roleTitle,
    });
    return { role, bound };
  }

  const role = await resolveRole(clientHint ?? {});
  return { role };
}

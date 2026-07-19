import type { RoleSlug } from "@/generated/client";
import {
  JOB_CUSTOM_COURSE,
  NAMASTE_COURSES,
  type NamasteCourseId,
} from "@/lib/courses/namaste-courses";

/** @deprecated Legacy generic role ids — mapped to nearest NamasteDev course. */
export type LegacyRoleId =
  | "full-stack"
  | "backend"
  | "frontend"
  | "product-minded";

export type RoleId = NamasteCourseId | LegacyRoleId | "job-custom";

const LEGACY_ROLE_ID_TO_SLUG: Record<LegacyRoleId, RoleSlug> = {
  "full-stack": "advanced_fullstack_bundle",
  backend: "namaste_node",
  frontend: "namaste_react",
  "product-minded": "namaste_interview",
};

const COURSE_ID_TO_SLUG = Object.fromEntries(
  [...NAMASTE_COURSES, JOB_CUSTOM_COURSE].map((course) => [
    course.id,
    course.slug,
  ]),
) as Record<string, RoleSlug>;

const ROLE_SLUG_TO_ID: Record<string, RoleId> = Object.fromEntries(
  [...NAMASTE_COURSES, JOB_CUSTOM_COURSE].map((course) => [
    course.slug,
    course.id,
  ]),
);

export function roleIdToSlug(roleId: string): RoleSlug | null {
  if (roleId in COURSE_ID_TO_SLUG) {
    return COURSE_ID_TO_SLUG[roleId];
  }
  if (roleId in LEGACY_ROLE_ID_TO_SLUG) {
    return LEGACY_ROLE_ID_TO_SLUG[roleId as LegacyRoleId];
  }
  return null;
}

const LEGACY_SLUG_TO_ID: Partial<Record<RoleSlug, RoleId>> = {
  full_stack: "advanced-fullstack-bundle",
  backend: "namaste-node",
  frontend: "namaste-react",
  product_minded: "namaste-interview",
};

export function roleSlugToId(slug: RoleSlug): RoleId {
  return ROLE_SLUG_TO_ID[slug] ?? LEGACY_SLUG_TO_ID[slug] ?? slug;
}

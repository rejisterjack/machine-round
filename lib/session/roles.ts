import type { RoleSlug } from "@/generated/client";
import {
  getNamasteCourse,
  getSelectableCourses,
} from "@/lib/courses/namaste-courses";
import { roleIdToSlug } from "@/lib/session/role-slug";

export type RoleDto = {
  id: string;
  slug: RoleSlug;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  rating?: number;
  language: string;
  tier?: "premium" | "free" | "bundle";
  href?: string;
};

function catalogRoles(): RoleDto[] {
  return getSelectableCourses().map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    icon: course.icon,
    imageUrl: course.imageUrl,
    rating: course.rating,
    language: course.language,
    tier: course.tier,
    href: course.href,
  }));
}

/** NamasteDev /learn catalog — not legacy generic engineer presets. */
export async function listRoles(): Promise<RoleDto[]> {
  return catalogRoles();
}

export async function resolveRole(input: {
  roleId?: string;
  roleTitle?: string;
  role?: string;
}): Promise<RoleDto> {
  const roles = await listRoles();
  const roleId = input.roleId;
  const roleTitle = input.roleTitle ?? input.role;

  if (roleId) {
    const fromCatalog = getNamasteCourse(roleId);
    if (fromCatalog) {
      return {
        id: fromCatalog.id,
        slug: fromCatalog.slug,
        title: fromCatalog.title,
        description: fromCatalog.description,
        icon: fromCatalog.icon,
        imageUrl: fromCatalog.imageUrl,
        rating: fromCatalog.rating,
        language: fromCatalog.language,
        tier: fromCatalog.tier,
        href: fromCatalog.href,
      };
    }

    const match = roles.find((role) => role.id === roleId);
    if (match) return match;
  }

  if (roleTitle) {
    const match = roles.find(
      (role) =>
        role.title === roleTitle ||
        role.title.toLowerCase() === roleTitle.toLowerCase(),
    );
    if (match) return match;
  }

  throw new Error(`Unknown role: ${roleId ?? roleTitle ?? "unspecified"}`);
}

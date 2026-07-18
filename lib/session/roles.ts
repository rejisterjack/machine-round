import type { RoleSlug } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import { roleIdToSlug, roleSlugToId } from "@/lib/session/role-slug";
import { roles as fallbackRoles } from "@/lib/design/tokens";
import { isDbReady } from "@/lib/db/ready";

export type RoleDto = {
  id: string;
  slug: RoleSlug;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  rating: number;
  language: string;
};

export async function listRoles(): Promise<RoleDto[]> {
  if (await isDbReady()) {
    const records = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return records.map((role) => ({
      id: roleSlugToId(role.slug),
      slug: role.slug,
      title: role.title,
      description: role.description,
      icon: role.icon,
      imageUrl: role.imageUrl,
      rating: role.rating,
      language: role.language,
    }));
  }

  return fallbackRoles.map((role) => {
    const slug = roleIdToSlug(role.id);
    if (!slug) {
      throw new Error(`Invalid fallback role: ${role.id}`);
    }
    return {
      id: role.id,
      slug,
      title: role.title,
      description: role.description,
      icon: role.icon,
      imageUrl: role.imageUrl,
      rating: role.rating,
      language: role.language,
    };
  });
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

import { Prisma } from "@/generated/client";
import { prisma } from "@/lib/prisma";

export type RoleRecord = {
  id: string;
  slug: string;
  title: string;
};

/**
 * Looks up a role by slug using SQL so new enum values (e.g. job_custom) work
 * even when the generated Prisma client has not been regenerated yet.
 */
export async function findRoleRecordBySlug(
  slug: string,
): Promise<RoleRecord | null> {
  const rows = await prisma.$queryRaw<RoleRecord[]>(
    Prisma.sql`
      SELECT id, slug::text AS slug, title
      FROM roles
      WHERE slug = ${slug}::"RoleSlug"
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

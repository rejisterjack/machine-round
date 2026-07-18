import type { RoleSlug } from "@/generated/client";
import type { RoleId } from "@/lib/design/tokens";

const ROLE_ID_TO_SLUG: Record<RoleId, RoleSlug> = {
  "full-stack": "full_stack",
  backend: "backend",
  frontend: "frontend",
  "product-minded": "product_minded",
};

const ROLE_SLUG_TO_ID: Record<RoleSlug, RoleId> = {
  full_stack: "full-stack",
  backend: "backend",
  frontend: "frontend",
  product_minded: "product-minded",
};

export function roleIdToSlug(roleId: string): RoleSlug | null {
  return ROLE_ID_TO_SLUG[roleId as RoleId] ?? null;
}

export function roleSlugToId(slug: RoleSlug): RoleId {
  return ROLE_SLUG_TO_ID[slug];
}

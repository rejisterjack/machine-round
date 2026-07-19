"use client";

import { roles as catalogRoles } from "@/lib/design/tokens";
import type { RoleId } from "@/lib/design/tokens";

export type RoleCard = {
  id: RoleId | string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  rating?: number;
  language: string;
  tier?: "premium" | "free" | "bundle";
  href?: string;
};

const roleCards: RoleCard[] = catalogRoles.map((role) => ({
  id: role.id,
  title: role.title,
  description: role.description,
  icon: role.icon,
  imageUrl: role.imageUrl,
  rating: role.rating,
  language: role.language,
  tier: role.tier,
  href: role.href,
}));

/** NamasteDev /learn catalog — always matches namastedev.com, not legacy DB presets. */
export function useRoles() {
  return {
    roles: roleCards,
    loading: false,
    source: "catalog" as const,
  };
}

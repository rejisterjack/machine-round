"use client";

import { useEffect, useState } from "react";
import { roles as fallbackRoles } from "@/lib/design/tokens";
import type { RoleId } from "@/lib/design/tokens";

export type RoleCard = {
  id: RoleId | string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  rating: number;
  language: string;
};

const fallbackRoleCards: RoleCard[] = fallbackRoles.map((role) => ({
  id: role.id,
  title: role.title,
  description: role.description,
  icon: role.icon,
  imageUrl: role.imageUrl,
  rating: role.rating,
  language: role.language,
}));

export function useRoles() {
  const [roles, setRoles] = useState<RoleCard[]>(fallbackRoleCards);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      try {
        const response = await fetch("/api/roles");
        if (!response.ok) {
          throw new Error("Failed to load roles.");
        }

        const data = (await response.json()) as { roles?: RoleCard[] };
        if (!cancelled && data.roles?.length) {
          setRoles(data.roles);
          setSource("api");
        }
      } catch {
        if (!cancelled) {
          setRoles(fallbackRoleCards);
          setSource("fallback");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, loading, source };
}

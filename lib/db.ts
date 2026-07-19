import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

import { getServerEnv } from "@/lib/env/server";

export function getDatabaseUrl(): string {
  return getServerEnv().DATABASE_URL;
}

export function getSql(): NeonQueryFunction<false, false> {
  return neon(getDatabaseUrl());
}

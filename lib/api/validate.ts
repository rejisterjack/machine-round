import type { z } from "zod";
import { ApiError } from "@/lib/api/errors";

export async function parseJson<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  return schema.parse(body);
}

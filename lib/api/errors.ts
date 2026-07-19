import { Prisma } from "@/generated/client";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiErrorResponse(error: unknown): {
  status: number;
  body: { error: string; code: ApiErrorCode };
} {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: error.issues[0]?.message ?? "Invalid request.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return {
        status: 404,
        body: { error: "Resource not found.", code: "NOT_FOUND" },
      };
    }
  }

  if (error instanceof Error) {
    if (
      error.message.includes("Expected RoleSlug") ||
      error.message.includes("Expected TrackMode") ||
      error.message.includes("Invalid value for argument")
    ) {
      return {
        status: 503,
        body: {
          error:
            "App schema is out of date. Run `bun run db:generate` and restart the dev server.",
          code: "INTERNAL_ERROR",
        },
      };
    }
  }

  console.error("Unhandled API error:", error);
  return {
    status: 500,
    body: {
      error: "Something went wrong. Please try again.",
      code: "INTERNAL_ERROR",
    },
  };
}

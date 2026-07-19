import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api/errors";

export const API_TIMEOUTS = {
  interview: 25_000,
  evaluate: 60_000,
  jdPlanning: 45_000,
  default: 15_000,
} as const;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 2;
  const delayMs = options.delayMs ?? 300;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

type RouteHandler<TContext = unknown> = (
  request: Request,
  context?: TContext,
) => Promise<Response>;

export function withApiHandler<TContext = unknown>(
  handler: RouteHandler<TContext>,
  options: { timeoutMs?: number } = {},
): RouteHandler<TContext> {
  const timeoutMs = options.timeoutMs ?? API_TIMEOUTS.default;

  return async (request: Request, context?: TContext) => {
    const startedAt = Date.now();
    const path = new URL(request.url).pathname;
    const requestId = request.headers.get("x-request-id") ?? "unknown";

    try {
      const response = await withTimeout(handler(request, context), timeoutMs);
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof Error && error.message.includes("timed out")) {
        console.error(
          JSON.stringify({
            level: "error",
            type: "api_timeout",
            requestId,
            method: request.method,
            path,
            durationMs,
            timeoutMs,
          }),
        );
        return NextResponse.json(
          { error: "Request timed out. Please retry.", code: "TIMEOUT" },
          { status: 504 },
        );
      }

      const { status, body } = toApiErrorResponse(error);
      if (status >= 500) {
        console.error(
          JSON.stringify({
            level: "error",
            type: "api_error",
            requestId,
            method: request.method,
            path,
            durationMs,
            status,
            code: body.code,
            message: error instanceof Error ? error.message : "unknown",
          }),
        );
      }

      return NextResponse.json(body, { status });
    }
  };
}

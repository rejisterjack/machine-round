import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { withApiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";

function runSeedScript() {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("bun", ["run", "scripts/seed-questions.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Seed script exited with code ${code ?? "unknown"}`));
    });
  });
}

export const POST = withApiHandler(async (request: Request) => {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Admin reseed is not configured.",
      501,
    );
  }

  const provided = request.headers.get("x-admin-secret");
  if (provided !== adminSecret) {
    throw new ApiError("VALIDATION_ERROR", "Unauthorized.", 401);
  }

  await runSeedScript();
  return NextResponse.json({ ok: true });
});

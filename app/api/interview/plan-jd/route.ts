import { NextResponse } from "next/server";
import { z } from "zod";
import { API_TIMEOUTS, withApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/require-auth";
import { planInterviewRoundsFromJd } from "@/lib/jd/plan-from-jd";
import {
  extractJobDescriptionText,
  normalizeJobDescriptionText,
} from "@/lib/jd/parse-document";

const planJdBodySchema = z.object({
  text: z.string().min(80).max(50_000).optional(),
});

export const POST = withApiHandler(async (request: Request) => {
  await requireAuth();

  const contentType = request.headers.get("content-type") ?? "";

  let jobDescription = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const pasted = formData.get("text");

    if (file instanceof File && file.size > 0) {
      jobDescription = normalizeJobDescriptionText(
        await extractJobDescriptionText(file),
      );
    } else if (typeof pasted === "string" && pasted.trim()) {
      jobDescription = normalizeJobDescriptionText(pasted);
    }
  } else {
    const body = planJdBodySchema.parse(await request.json());
    if (!body.text) {
      return NextResponse.json(
        { error: "Job description text is required." },
        { status: 400 },
      );
    }
    jobDescription = normalizeJobDescriptionText(body.text);
  }

  if (jobDescription.length < 80) {
    return NextResponse.json(
      { error: "Job description is too short. Include responsibilities and requirements." },
      { status: 400 },
    );
  }

  const plan = await planInterviewRoundsFromJd(jobDescription);

  return NextResponse.json({
    plan,
    jobDescriptionSummary: jobDescription.slice(0, 2000),
  });
}, { timeoutMs: API_TIMEOUTS.jdPlanning });

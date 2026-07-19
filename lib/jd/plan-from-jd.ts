import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getAzureChatModel } from "@/lib/ai";
import {
  getDefaultRoundsForRole,
  INTERVIEW_ROUND_TYPES,
  type JobInterviewPlan,
  type PlannedInterviewRound,
} from "@/lib/courses/jd-rounds";

const plannedRoundSchema = z.object({
  id: z.string(),
  type: z.enum(INTERVIEW_ROUND_TYPES),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number().int().min(10).max(120),
  recommendedDuration: z.enum(["minutes_15", "minutes_30", "minutes_60"]),
  promptFocus: z.string(),
});

const planSchema = z.object({
  roleTitle: z.string(),
  companySummary: z.string(),
  mustHaveSkills: z.array(z.string()).min(1).max(12),
  rounds: z.array(plannedRoundSchema).min(2).max(8),
});

function parseJsonPlan(content: string): JobInterviewPlan {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  return planSchema.parse(parsed);
}

export async function planInterviewRoundsFromJd(
  jobDescription: string,
): Promise<JobInterviewPlan> {
  const trimmed = jobDescription.trim();
  if (trimmed.length < 80) {
    throw new Error("Job description is too short. Paste the full JD.");
  }

  const model = getAzureChatModel();

  try {
    const response = await model.invoke([
      new SystemMessage(`You plan realistic interview loops from job descriptions for Indian tech hiring.
Return JSON only:
{
  "roleTitle": "string",
  "companySummary": "one sentence",
  "mustHaveSkills": ["skill1", "skill2"],
  "rounds": [
    {
      "id": "kebab-case-id",
      "type": one of ${INTERVIEW_ROUND_TYPES.join("|")},
      "title": "round name",
      "description": "what this round covers",
      "estimatedMinutes": number,
      "recommendedDuration": "minutes_15" | "minutes_30" | "minutes_60",
      "promptFocus": "instructions for the AI interviewer for this specific round"
    }
  ]
}
Pick 3-6 rounds that match the JD (e.g. frontend roles need React/FSD rounds; backend needs system design). Align promptFocus with skills in the JD.`),
      new HumanMessage(trimmed.slice(0, 12_000)),
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return parseJsonPlan(content);
  } catch {
    const roleTitle = extractRoleTitleFallback(trimmed);
    return {
      roleTitle,
      companySummary: "Role inferred from uploaded job description.",
      mustHaveSkills: extractSkillsFallback(trimmed),
      rounds: getDefaultRoundsForRole(roleTitle),
    };
  }
}

function extractRoleTitleFallback(jd: string): string {
  const titleMatch = jd.match(
    /(?:job title|position|role)\s*[:\-]\s*([^\n]+)/i,
  );
  if (titleMatch?.[1]) return titleMatch[1].trim().slice(0, 80);
  const firstLine = jd.split("\n").find((line) => line.trim().length > 3);
  return firstLine?.trim().slice(0, 80) ?? "Software Engineer";
}

function extractSkillsFallback(jd: string): string[] {
  const keywords = [
    "React",
    "Node",
    "JavaScript",
    "TypeScript",
    "DSA",
    "system design",
    "frontend",
    "backend",
    "full stack",
  ];
  const lower = jd.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

export function buildRoundPromptContext(
  plan: JobInterviewPlan,
  round: PlannedInterviewRound,
): string {
  return `Job-specific interview plan:
Role: ${plan.roleTitle}
Company context: ${plan.companySummary}
Must-have skills: ${plan.mustHaveSkills.join(", ")}
Round: ${round.title} (${round.type})
Round focus: ${round.promptFocus}
Tailor every question to this job description and round type.`;
}

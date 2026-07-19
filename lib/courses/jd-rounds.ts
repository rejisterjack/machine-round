export const INTERVIEW_ROUND_TYPES = [
  "hr_screening",
  "technical_phone",
  "dsa_coding",
  "machine_coding",
  "frontend_system_design",
  "backend_system_design",
  "system_design",
  "behavioral",
  "hiring_manager",
] as const;

export type InterviewRoundType = (typeof INTERVIEW_ROUND_TYPES)[number];

export type PlannedInterviewRound = {
  id: string;
  type: InterviewRoundType;
  title: string;
  description: string;
  estimatedMinutes: number;
  promptFocus: string;
  recommendedDuration: "minutes_15" | "minutes_30" | "minutes_60";
};

export type JobInterviewPlan = {
  roleTitle: string;
  companySummary: string;
  mustHaveSkills: string[];
  rounds: PlannedInterviewRound[];
};

export const ROUND_TYPE_LABELS: Record<InterviewRoundType, string> = {
  hr_screening: "HR / Recruiter Screen",
  technical_phone: "Technical Phone Screen",
  dsa_coding: "DSA / Coding Round",
  machine_coding: "Machine Coding Round",
  frontend_system_design: "Frontend System Design",
  backend_system_design: "Backend System Design",
  system_design: "System Design",
  behavioral: "Behavioral Round",
  hiring_manager: "Hiring Manager Round",
};

export function getDefaultRoundsForRole(roleTitle: string): PlannedInterviewRound[] {
  return [
    {
      id: "hr-screen",
      type: "hr_screening",
      title: "HR / Recruiter Screen",
      description: `Introductory screen for ${roleTitle} — background, motivation, and logistics.`,
      estimatedMinutes: 15,
      recommendedDuration: "minutes_15",
      promptFocus:
        "Conduct a recruiter-style screen. Ask about background, motivation, notice period, and role fit. Keep it conversational.",
    },
    {
      id: "tech-phone",
      type: "technical_phone",
      title: "Technical Phone Screen",
      description: "Light technical discussion and fundamentals before deeper rounds.",
      estimatedMinutes: 30,
      recommendedDuration: "minutes_30",
      promptFocus:
        "Ask foundational technical questions aligned to the role. Probe past projects and one or two technical depth questions.",
    },
    {
      id: "machine-coding",
      type: "machine_coding",
      title: "Machine Coding Round",
      description: "Live coding on shared screen — build or debug in real time.",
      estimatedMinutes: 60,
      recommendedDuration: "minutes_60",
      promptFocus:
        "Run a live machine coding round. Ask them to share screen and implement or extend a feature. Follow visible code and ask follow-ups.",
    },
    {
      id: "system-design",
      type: "system_design",
      title: "System Design",
      description: "Architecture and tradeoffs for systems at scale.",
      estimatedMinutes: 45,
      recommendedDuration: "minutes_60",
      promptFocus:
        "Ask a system design question appropriate to the role. Probe requirements, scale, APIs, data model, and tradeoffs.",
    },
    {
      id: "behavioral",
      type: "behavioral",
      title: "Behavioral Round",
      description: "Ownership, conflict, and collaboration stories.",
      estimatedMinutes: 30,
      recommendedDuration: "minutes_30",
      promptFocus:
        "Ask behavioral questions about ownership, conflict, failure, and collaboration. Demand specific examples with outcomes.",
    },
    {
      id: "hiring-manager",
      type: "hiring_manager",
      title: "Hiring Manager Round",
      description: "Team fit, scope, and seniority signal with the hiring manager.",
      estimatedMinutes: 30,
      recommendedDuration: "minutes_30",
      promptFocus:
        "Conduct a hiring manager round — team fit, scope of role, growth, and how they would approach the first 90 days.",
    },
  ];
}

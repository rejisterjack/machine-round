import { z } from "zod";

export const interviewMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const interviewRequestSchema = z.object({
  role: z.string(),
  messages: z.array(interviewMessageSchema),
  questionCount: z.number().int().min(0),
  sessionId: z.string().optional(),
});

export const interviewResponseSchema = z.object({
  message: z.string(),
  done: z.boolean(),
  referencedAnswer: z.string().optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
});

export const evaluateRequestSchema = z.object({
  role: z.string(),
  messages: z.array(interviewMessageSchema),
  sessionId: z.string().optional(),
});

export const evaluateResponseSchema = z.object({
  overallScore: z.number(),
  summary: z.string(),
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      clarity: z.number(),
      structure: z.number(),
      technicalSignal: z.number(),
      redFlags: z.array(z.string()),
    }),
  ),
  improvements: z.array(z.string()),
});

export type InterviewMessage = z.infer<typeof interviewMessageSchema>;
export type InterviewResponse = z.infer<typeof interviewResponseSchema>;
export type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;

export type InterviewSession = {
  roleId: string;
  roleTitle: string;
  messages: InterviewMessage[];
  questionCount: number;
  topicsCovered: string[];
  weakSignals: string[];
  status: "idle" | "thinking" | "listening" | "error" | "complete";
  error?: string;
  report?: EvaluateResponse;
  dbSessionId?: string;
  publicId?: string;
};

export const SESSION_STORAGE_KEY = "namaste-machine-round-session";
const LEGACY_SESSION_STORAGE_KEY = "machineround-session";

export function loadSession(): InterviewSession | null {
  if (typeof window === "undefined") return null;
  const raw =
    sessionStorage.getItem(SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as InterviewSession;
    if (!sessionStorage.getItem(SESSION_STORAGE_KEY)) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
      sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: InterviewSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function createSession(roleId: string, roleTitle: string): InterviewSession {
  return {
    roleId,
    roleTitle,
    messages: [],
    questionCount: 0,
    topicsCovered: [],
    weakSignals: [],
    status: "idle",
  };
}

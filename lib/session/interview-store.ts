import { z } from "zod";
import { PANELIST_IDS, PANELIST_MODES } from "@/lib/ai/personas/panelists";

export const panelistIdSchema = z.enum(PANELIST_IDS);
export const panelistModeSchema = z.enum(PANELIST_MODES);

export const interviewMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  speaker: panelistIdSchema.optional(),
});

const roleFields = {
  roleId: z.string().optional(),
  roleTitle: z.string().optional(),
  role: z.string().optional(),
};

export const interviewRequestSchema = z
  .object({
    ...roleFields,
    messages: z.array(interviewMessageSchema),
    questionCount: z.number().int().min(0),
    panelistMode: panelistModeSchema.optional(),
    sessionId: z.string().optional(),
  })
  .refine((data) => Boolean(data.roleId || data.roleTitle || data.role), {
    message: "roleId, roleTitle, or role is required.",
  });

export const interviewResponseSchema = z.object({
  message: z.string(),
  speaker: panelistIdSchema.optional(),
  done: z.boolean(),
  referencedAnswer: z.string().optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
});

export const transcriptRequestSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1),
  role: z.enum(["user", "assistant"]).default("user"),
  speaker: panelistIdSchema.optional(),
  questionCount: z.number().int().min(0).optional(),
  topicsCovered: z.array(z.string()).optional(),
  weakSignals: z.array(z.string()).optional(),
  referencedAnswer: z.string().optional(),
  clientSyncId: z.string().optional(),
  status: z
    .enum(["active", "thinking", "completed", "abandoned", "error"])
    .optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const screenObservationSchema = z.object({
  timestamp: z.string(),
  summary: z.string(),
});

export const evaluateRequestSchema = z
  .object({
    ...roleFields,
    messages: z.array(interviewMessageSchema),
    sessionId: z.string().optional(),
    weakSignals: z.array(z.string()).optional(),
    screenObservations: z.array(screenObservationSchema).optional(),
  })
  .refine((data) => Boolean(data.roleId || data.roleTitle || data.role), {
    message: "roleId, roleTitle, or role is required.",
  });

export const weakTopicSchema = z.object({
  label: z.string(),
  weight: z.number().optional(),
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
  weakTopics: z.array(weakTopicSchema).optional(),
  screenReviewNotes: z.array(z.string()).optional(),
});

export type InterviewMessage = z.infer<typeof interviewMessageSchema>;
export type InterviewResponse = z.infer<typeof interviewResponseSchema>;
export type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;
export type WeakTopic = z.infer<typeof weakTopicSchema>;
export type PanelistMode = z.infer<typeof panelistModeSchema>;
export type ScreenObservation = z.infer<typeof screenObservationSchema>;

export type InterviewSession = {
  roleId: string;
  roleTitle: string;
  panelistMode: PanelistMode;
  messages: InterviewMessage[];
  questionCount: number;
  topicsCovered: string[];
  weakSignals: string[];
  screenSharing?: boolean;
  screenObservations?: ScreenObservation[];
  status: "idle" | "thinking" | "listening" | "error" | "complete";
  inputMode?: "text" | "voice" | "mixed";
  error?: string;
  report?: EvaluateResponse & { shareToken?: string | null };
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
    if (!session.panelistMode) {
      session.panelistMode = "both";
    }
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

export function createSession(
  roleId: string,
  roleTitle: string,
  panelistMode: PanelistMode = "both",
): InterviewSession {
  return {
    roleId,
    roleTitle,
    panelistMode,
    messages: [],
    questionCount: 0,
    topicsCovered: [],
    weakSignals: [],
    status: "idle",
    inputMode: "voice",
  };
}

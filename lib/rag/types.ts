import type { QuestionCategory } from "@/generated/client";
import type { InterviewMessage } from "@/lib/session/interview-store";

export type GroundedQuestion = {
  id: string;
  content: string;
  category: QuestionCategory;
  difficulty: number | null;
  courseId: string | null;
  distance: number;
};

export type RetrievalOptions = {
  roleTitle: string;
  limit?: number;
  courseId?: string;
  topicAreas?: string[];
  strictScope?: boolean;
  lastUserAnswer?: string;
  lastAssistant?: string;
  messages?: InterviewMessage[];
  phase?: "greeting" | "follow_up";
};

export type RetrievalResult = {
  questions: GroundedQuestion[];
  query: string;
  excludedCount: number;
  scoped: boolean;
  latencyMs: number;
};

export type GroundedQuestionOptions = {
  topicAreas?: string[];
  strictScope?: boolean;
  lastUserAnswer?: string;
  lastAssistant?: string;
  messages?: InterviewMessage[];
  phase?: "greeting" | "follow_up";
};

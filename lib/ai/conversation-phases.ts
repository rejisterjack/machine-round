import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import type { InterviewScope } from "@/lib/courses/interview-scope";
import { getCourseInterviewScope } from "@/lib/courses/interview-scope";
import {
  shouldEndByDuration,
  shouldWarnDurationWrapUp,
} from "@/lib/ai/question-cap";
import {
  DEFAULT_INTERVIEW_DURATION,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import type { InterviewMessage } from "@/lib/session/interview-store";

export type ConversationPhase = "greeting" | "warmup" | "explore" | "closing";

const VARIETY_STYLES = [
  "Open casually — a warm hello and light context-setting.",
  "Start with brief, friendly small-talk before the first question.",
  "Be direct but warm — set expectations quickly, then ease in.",
  "Use a short anecdotal tone, like you just sat down for a coffee chat.",
] as const;

export function buildSessionVarietySeed(sessionId: string): number {
  let hash = 0;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getVarietyStyle(sessionId: string): string {
  const index = buildSessionVarietySeed(sessionId) % VARIETY_STYLES.length;
  return VARIETY_STYLES[index];
}

export function getConversationPhase(
  questionCount: number,
  elapsedSeconds: number,
  interviewDuration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): ConversationPhase {
  if (questionCount <= 0) return "greeting";
  if (questionCount === 1) return "warmup";
  if (
    shouldWarnDurationWrapUp(elapsedSeconds, interviewDuration) ||
    shouldEndByDuration(elapsedSeconds, interviewDuration)
  ) {
    return "closing";
  }
  return "explore";
}

export function getPhaseGuidance(input: {
  phase: ConversationPhase;
  role: string;
  questionCount: number;
  panelistMode: PanelistMode;
  activePanelist: PanelistId;
  priorSpeaker?: PanelistId;
  varietyStyle?: string;
  interviewScope?: InterviewScope | null;
}): string {
  const panelist = getPanelist(input.activePanelist);
  const coPanelist =
    input.panelistMode === "both"
      ? getPanelist(input.activePanelist === "akshay" ? "archy" : "akshay")
      : null;
  const variety = input.varietyStyle
    ? ` Opener style for this session: ${input.varietyStyle}`
    : "";
  const scope = input.interviewScope;
  const allowedTopics =
    scope?.allowedTopics.length ?
      scope.allowedTopics.join(", ")
    : input.role;

  switch (input.phase) {
    case "greeting":
      if (input.panelistMode === "both" && input.activePanelist === "akshay") {
        return `Open the live call naturally.${variety} Introduce yourself and mention ${coPanelist?.shortName} is on too. Briefly frame this as a ${scope?.title ?? input.role} machine round. Do not reuse the same greeting you've used in other sessions.`;
      }
      return `Open the live call naturally.${variety} Introduce yourself as ${panelist.shortName} and frame this as a ${scope?.title ?? input.role} machine round. Vary your wording each time.`;

    case "warmup":
      if (scope?.strictCourseMode) {
        return `Ease in with a light syllabus-aligned warm-up question from: ${allowedTopics}. Do NOT ask about background, resume, personal projects, or career goals.`;
      }
      if (scope?.allowsBehavioral) {
        return `Ease in conversationally with a light frontend interview warm-up — background or motivation is fine, then move into technical depth.`;
      }
      return `Ease in conversationally. Ask about their background or what drew them to ${input.role}. React to what they actually said — do not use a canned script.`;

    case "explore":
      if (scope?.strictCourseMode) {
        return `Stay strictly within the syllabus (${allowedTopics}). Follow the candidate's thread with one focused technical question at a time. Do NOT ask behavioral, resume, or off-syllabus questions.`;
      }
      if (scope?.allowsBehavioral) {
        return `Mix frontend technical depth with realistic behavioral probes. Follow the candidate's thread and ask one focused question at a time.`;
      }
      return `Follow the candidate's thread. Pick up something specific from their last answer and ask one focused question. Vary topic areas naturally (technical depth, ownership, tradeoffs, communication) based on what they shared — do not march through a fixed checklist.`;

    case "closing":
      return `Wrap up warmly. Thank them, say something genuine about the conversation, and mention their readiness report is next. Keep it brief and human.`;

    default:
      return "Continue naturally.";
  }
}

export function getPriorAssistantSpeaker(
  messages: InterviewMessage[],
): PanelistId | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant" && message.speaker) {
      return message.speaker;
    }
  }
  return undefined;
}

export function isPanelistHandoff(
  activePanelist: PanelistId,
  priorSpeaker: PanelistId | undefined,
  panelistMode: PanelistMode,
): boolean {
  return (
    panelistMode === "both" &&
    priorSpeaker !== undefined &&
    priorSpeaker !== activePanelist
  );
}

export function buildHandoffInstruction(input: {
  activePanelist: PanelistId;
  priorSpeaker: PanelistId;
  lastUserAnswer?: string;
  routerReason?: string;
}): string {
  const incoming = getPanelist(input.activePanelist);
  const outgoing = getPanelist(input.priorSpeaker);
  const answerSnippet = input.lastUserAnswer
    ? ` They just said: "${input.lastUserAnswer.slice(0, 200)}${input.lastUserAnswer.length > 200 ? "…" : ""}"`
    : "";
  const routerNote = input.routerReason
    ? ` Context: ${input.routerReason}.`
    : "";

  return `You are ${incoming.name}. ${outgoing.shortName} spoke last.${answerSnippet}${routerNote} Pass the mic naturally — brief banter with ${outgoing.shortName} if it fits, then one focused question. Never say it is "your turn" or correct the candidate about who should speak.`;
}

export function getLastUserAnswer(messages: InterviewMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user") {
      return message.content;
    }
  }
  return undefined;
}

export function getLastAssistantMessage(
  messages: InterviewMessage[],
  speaker?: PanelistId,
): InterviewMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    if (!speaker || message.speaker === speaker) {
      return message;
    }
  }
  return undefined;
}

export function buildSamePanelistFollowUpPrompt(input: {
  activePanelist: PanelistId;
  lastUserAnswer: string;
  lastAssistantQuestion?: string;
}): string {
  const panelist = getPanelist(input.activePanelist);
  const questionSnippet = input.lastAssistantQuestion
    ? `You asked: "${input.lastAssistantQuestion.slice(0, 200)}${input.lastAssistantQuestion.length > 200 ? "…" : ""}"`
    : "You asked the previous question.";

  return `${panelist.shortName}, you own this thread. ${questionSnippet}
The candidate just answered: "${input.lastUserAnswer.slice(0, 400)}${input.lastUserAnswer.length > 400 ? "…" : ""}"

Ask ONE follow-up that builds directly on what they said. Quote or paraphrase something specific from their answer. Do not change topic or pull a random question from a bank.`;
}

export function buildContinuationPrompt(input: {
  role: string;
  questionCount: number;
  panelistMode: PanelistMode;
  activePanelist: PanelistId;
  transcript: string;
  messages: InterviewMessage[];
  routerReason?: string;
  courseId?: string;
  promptContext?: string;
  elapsedSeconds?: number;
  interviewDuration?: InterviewDuration;
}): string {
  const panelist = getPanelist(input.activePanelist);
  const interviewDuration =
    input.interviewDuration ?? DEFAULT_INTERVIEW_DURATION;
  const phase = getConversationPhase(
    input.questionCount,
    input.elapsedSeconds ?? 0,
    interviewDuration,
  );
  const priorSpeaker = getPriorAssistantSpeaker(input.messages);
  const isHandoff = isPanelistHandoff(
    input.activePanelist,
    priorSpeaker,
    input.panelistMode,
  );
  const lastUserAnswer = getLastUserAnswer(input.messages);
  const samePanelistContinuation =
    !isHandoff &&
    priorSpeaker === input.activePanelist &&
    lastUserAnswer;

  const interviewScope = getCourseInterviewScope(
    input.courseId,
    input.promptContext,
  );

  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
    priorSpeaker,
    interviewScope,
  });

  const handoffBlock = isHandoff && priorSpeaker
    ? `\n${buildHandoffInstruction({
        activePanelist: input.activePanelist,
        priorSpeaker,
        lastUserAnswer,
        routerReason: input.routerReason,
      })}`
    : input.routerReason
      ? `\nRouting note: ${input.routerReason}`
      : "";

  const followUpBlock = samePanelistContinuation
    ? `\n${buildSamePanelistFollowUpPrompt({
        activePanelist: input.activePanelist,
        lastUserAnswer,
        lastAssistantQuestion: getLastAssistantMessage(
          input.messages,
          input.activePanelist,
        )?.content,
      })}`
    : "";

  return `Prior transcript:
${input.transcript}

You are ${panelist.name} on a live call.
Phase: ${phase}
${phaseGuidance}
${followUpBlock}
${handoffBlock}

Respond to what the candidate just said. One question or brief reaction plus one question. Spoken words only.`;
}

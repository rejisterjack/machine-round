import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import type { InterviewMessage } from "@/lib/session/interview-store";

export type ConversationPhase = "greeting" | "warmup" | "explore" | "closing";

const EXPLORE_TOPIC_HINTS_DUAL: Record<number, string> = {
  2: "behavioral or communication — ownership, outcomes, how they explain tradeoffs",
  3: "technical depth — structured problem-solving or a concrete scenario",
  4: "career judgment, adaptability, or teamwork",
  5: "system design tradeoffs or implementation details",
};

const EXPLORE_TOPIC_HINTS_AKSHAY: Record<number, string> = {
  2: "ownership, outcomes, or product impact",
  3: "communication clarity or how they explain tradeoffs",
  4: "intentional growth or consistency under pressure",
  5: "a concrete example of shipping impact",
};

const EXPLORE_TOPIC_HINTS_ARCHY: Record<number, string> = {
  2: "structured problem-solving or a concrete technical scenario",
  3: "system design tradeoffs or implementation details",
  4: "optimization or validation of their approach",
  5: "arrays, trees, graphs, or DP depth as appropriate",
};

export function getConversationPhase(
  questionCount: number,
  maxQuestions: number = MAX_QUESTIONS,
): ConversationPhase {
  if (questionCount <= 0) return "greeting";
  if (questionCount === 1) return "warmup";
  if (questionCount >= maxQuestions - 1) return "closing";
  return "explore";
}

function getExploreTopicHint(
  questionCount: number,
  panelistMode: PanelistMode,
  activePanelist: PanelistId,
): string {
  if (panelistMode === "both") {
    return (
      EXPLORE_TOPIC_HINTS_DUAL[questionCount] ??
      "an appropriate follow-up tied to what they just shared"
    );
  }
  const hints =
    activePanelist === "akshay"
      ? EXPLORE_TOPIC_HINTS_AKSHAY
      : EXPLORE_TOPIC_HINTS_ARCHY;
  return (
    hints[questionCount] ??
    "an appropriate follow-up tied to what they just shared"
  );
}

export function getPhaseGuidance(input: {
  phase: ConversationPhase;
  role: string;
  questionCount: number;
  panelistMode: PanelistMode;
  activePanelist: PanelistId;
  priorSpeaker?: PanelistId;
}): string {
  const panelist = getPanelist(input.activePanelist);
  const coPanelist =
    input.panelistMode === "both"
      ? getPanelist(input.activePanelist === "akshay" ? "archy" : "akshay")
      : null;

  switch (input.phase) {
    case "greeting":
      if (input.panelistMode === "both" && input.activePanelist === "akshay") {
        return `Open the call like a real video interview. Greet them warmly ("hey, thanks for joining"), introduce yourself and mention ${coPanelist?.shortName} is on the call too. Briefly explain this is a quick machine round for ${input.role}. End with a light, easy opener — not a hard technical grill yet.`;
      }
      return `Open the call like a real video interview. Greet them warmly ("hey, thanks for hopping on"), introduce yourself as ${panelist.shortName}, and mention this is a machine round for ${input.role}. End with a light, conversational opener — ease them in.`;

    case "warmup":
      return `Ease into the interview. Ask about their background, what they're working on lately, or what drew them to ${input.role}. React naturally to their answer before your question. Keep it conversational — you're getting to know them.`;

    case "explore": {
      const topic = getExploreTopicHint(
        input.questionCount,
        input.panelistMode,
        input.activePanelist,
      );
      return `Main interview phase. Topic area to explore: ${topic}. React to their last answer first ("okay", "got it", "interesting") — then ask one focused question. Weave in something specific they said when it fits naturally. If their answer was vague, ask a gentle clarifier before moving on.`;
    }

    case "closing":
      return `Wrap up warmly. You may ask one final reflection question OR skip straight to closing. Thank them for their time, say something encouraging, and let them know their readiness report is coming up next. Sound human — not like a script ending.`;

    default:
      return "Continue the conversation naturally.";
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
}): string {
  const incoming = getPanelist(input.activePanelist);
  const outgoing = getPanelist(input.priorSpeaker);
  const answerSnippet = input.lastUserAnswer
    ? ` The candidate just said: "${input.lastUserAnswer.slice(0, 200)}${input.lastUserAnswer.length > 200 ? "…" : ""}"`
    : "";

  return `You are ${incoming.name}. ${outgoing.shortName} just spoke.${answerSnippet}

Open with a natural verbal handoff — like you're in the same room on a video call. Examples:
- "Thanks ${outgoing.shortName} — hey, on that point you mentioned about…"
- "${outgoing.shortName}, good question — I'd love to dig into the technical side of that."
- "Yeah, ${outgoing.shortName} covered the context well — mind if I ask about…"

Do NOT say "${incoming.shortName} here" or introduce yourself formally. Brief banter with ${outgoing.shortName} is welcome, then ask ONE focused question.`;
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

export function buildContinuationPrompt(input: {
  role: string;
  questionCount: number;
  panelistMode: PanelistMode;
  activePanelist: PanelistId;
  transcript: string;
  messages: InterviewMessage[];
}): string {
  const panelist = getPanelist(input.activePanelist);
  const phase = getConversationPhase(input.questionCount);
  const priorSpeaker = getPriorAssistantSpeaker(input.messages);
  const isHandoff = isPanelistHandoff(
    input.activePanelist,
    priorSpeaker,
    input.panelistMode,
  );
  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
    priorSpeaker,
  });

  const handoffBlock = isHandoff && priorSpeaker
    ? `\n\n${buildHandoffInstruction({
        activePanelist: input.activePanelist,
        priorSpeaker,
        lastUserAnswer: getLastUserAnswer(input.messages),
      })}`
    : "";

  return `Prior transcript:
${input.transcript}

You are ${panelist.name}. Continue the live voice interview.
Phase: ${phase}
${phaseGuidance}
${handoffBlock}

React to what the candidate just said before asking your next question. Speak now.`;
}

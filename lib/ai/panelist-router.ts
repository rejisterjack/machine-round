import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getAzureChatModel } from "@/lib/ai";
import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import { withRetry } from "@/lib/api/handler";
import type { InterviewMessage } from "@/lib/session/interview-store";
import {
  getLastUserAnswer,
  getPriorAssistantSpeaker,
} from "@/lib/ai/conversation-phases";

export type SpeakerDecision = {
  speaker: PanelistId;
  reason: string;
  threadComplete?: boolean;
};

const THREAD_CLOSURE_PATTERNS = [
  /\bthat'?s (all|it|everything)\b/i,
  /\banyway\b/i,
  /\bmoving on\b/i,
  /\bnext topic\b/i,
  /\bhope that (answers|helps)\b/i,
  /\blet me know if\b/i,
];

/** Fast path: candidate explicitly named a panelist in their last message. */
export function detectAddressedPanelist(text: string): PanelistId | null {
  const lower = text.toLowerCase();
  if (/\b(archy|archie)\b/.test(lower)) return "archy";
  if (/\b(akshay)\b/.test(lower)) return "akshay";
  return null;
}

export function signalsThreadClosure(userMessage: string): boolean {
  return THREAD_CLOSURE_PATTERNS.some((pattern) => pattern.test(userMessage));
}

/** Count consecutive assistant turns from the same panelist at end of transcript. */
export function countConsecutivePanelistTurns(
  messages: InterviewMessage[],
  panelist: PanelistId,
): number {
  let count = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    if (message.speaker === panelist) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export function isThreadComplete(
  messages: InterviewMessage[],
  priorAssistant: PanelistId | undefined,
): boolean {
  if (!priorAssistant) return true;

  const lastUser = getLastUserAnswer(messages);
  if (lastUser && signalsThreadClosure(lastUser)) return true;

  return countConsecutivePanelistTurns(messages, priorAssistant) >= 2;
}

export function parseSpeakerDecision(content: string): SpeakerDecision | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      speaker?: string;
      reason?: string;
      threadComplete?: boolean;
    };
    const speaker = parsed.speaker?.toLowerCase();
    if (speaker === "akshay" || speaker === "archy") {
      return {
        speaker,
        reason: parsed.reason?.trim() || "Model routing decision",
        threadComplete: parsed.threadComplete,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function buildRouterPrompt(input: {
  messages: InterviewMessage[];
  connectedPanelist: PanelistId;
  priorAssistant: PanelistId;
  roleTitle: string;
}): string {
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const transcript = input.messages
    .slice(-8)
    .map((m) =>
      m.role === "user"
        ? `candidate: ${m.content}`
        : `${m.speaker ?? "assistant"}: ${m.content}`,
    )
    .join("\n");

  const otherPanelist =
    input.priorAssistant === "akshay" ? "archy" : "akshay";

  return `You route a live dual-panel interview for ${input.roleTitle}.

Panelists:
- akshay (${getPanelist("akshay").focus.join(", ")})
- archy (${getPanelist("archy").focus.join(", ")})

Recent transcript:
${transcript || "(no messages yet)"}

Current voice connection: ${input.connectedPanelist}
Panelist who owns the current thread: ${input.priorAssistant}
Candidate's latest message: ${lastUser?.content ?? "(none)"}

The current thread with ${getPanelist(input.priorAssistant).shortName} is complete. Pick who should speak NEXT.

Rules:
1. If the candidate addressed akshay or archy by name, pick that person.
2. Default to keeping ${getPanelist(input.priorAssistant).shortName} if a follow-up on the same topic still makes sense.
3. Switch to ${getPanelist(otherPanelist).shortName} only when the topic naturally shifts (e.g. technical → behavioral) or ${getPanelist(otherPanelist).shortName} is clearly better suited.
4. Do not switch just to alternate panelists — continuity matters.

Respond with JSON only: {"speaker":"akshay"|"archy","reason":"one short sentence","threadComplete":true}`;
}

export async function resolveNextSpeaker(input: {
  messages: InterviewMessage[];
  panelistMode: PanelistMode;
  connectedPanelist: PanelistId;
  roleTitle: string;
}): Promise<SpeakerDecision> {
  if (input.panelistMode === "akshay") {
    return { speaker: "akshay", reason: "Solo Akshay panel" };
  }
  if (input.panelistMode === "archy") {
    return { speaker: "archy", reason: "Solo Archy panel" };
  }

  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const addressed = lastUser
    ? detectAddressedPanelist(lastUser.content)
    : null;
  if (addressed) {
    return {
      speaker: addressed,
      reason: `Candidate addressed ${getPanelist(addressed).shortName} directly`,
      threadComplete: true,
    };
  }

  const priorAssistant = getPriorAssistantSpeaker(input.messages);
  const stickySpeaker = priorAssistant ?? input.connectedPanelist;
  const threadComplete = isThreadComplete(input.messages, priorAssistant);

  if (!threadComplete) {
    return {
      speaker: stickySpeaker,
      reason: `Continuing ${getPanelist(stickySpeaker).shortName}'s thread`,
      threadComplete: false,
    };
  }

  if (!priorAssistant) {
    return {
      speaker: input.connectedPanelist,
      reason: "Continue with connected panelist",
      threadComplete: true,
    };
  }

  try {
    const model = getAzureChatModel();
    const response = await withRetry(() =>
      model.invoke([
        new SystemMessage(
          buildRouterPrompt({
            messages: input.messages,
            connectedPanelist: input.connectedPanelist,
            priorAssistant,
            roleTitle: input.roleTitle,
          }),
        ),
        new HumanMessage("Who should respond next?"),
      ]),
    );
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const parsed = parseSpeakerDecision(content);
    if (parsed) {
      return { ...parsed, threadComplete: true };
    }
  } catch {
    // Fall through to sticky speaker.
  }

  return {
    speaker: stickySpeaker,
    reason: `Staying with ${getPanelist(stickySpeaker).shortName} after thread`,
    threadComplete: true,
  };
}

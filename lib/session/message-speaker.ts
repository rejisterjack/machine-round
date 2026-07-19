import {
  isPanelistId,
  type PanelistId,
} from "@/lib/ai/personas/panelists";
import type { InterviewMessage } from "@/lib/session/interview-store";

/** Map nullable DB `speakerName` to a valid interview message speaker. */
export function normalizeInterviewMessageSpeaker(
  speakerName: string | null | undefined,
): InterviewMessage["speaker"] {
  if (!speakerName || !isPanelistId(speakerName)) {
    return undefined;
  }
  return speakerName satisfies PanelistId;
}

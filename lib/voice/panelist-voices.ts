import type { PanelistId } from "@/lib/ai/personas/panelists";

/** Built-in gpt-realtime voices supported on Azure OpenAI Realtime. */
export const SUPPORTED_REALTIME_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "marin",
  "sage",
  "shimmer",
  "verse",
]);

/** Default Realtime voices per panelist (cedar + sage are the most natural pair). */
export const PANELIST_REALTIME_VOICE: Record<PanelistId, string> = {
  akshay: "cedar",
  archy: "sage",
};

/** Voice string passed to Azure OpenAI Realtime `audio.output.voice`. */
export function resolveRealtimeVoice(
  panelistId: PanelistId,
  requestedVoice?: string,
): string {
  if (requestedVoice && SUPPORTED_REALTIME_VOICES.has(requestedVoice)) {
    return requestedVoice;
  }
  return PANELIST_REALTIME_VOICE[panelistId];
}

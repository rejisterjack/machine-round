export const INTERVIEW_DURATIONS = [
  "minutes_15",
  "minutes_30",
  "minutes_60",
] as const;

export type InterviewDuration = (typeof INTERVIEW_DURATIONS)[number];

export const DEFAULT_INTERVIEW_DURATION: InterviewDuration = "minutes_30";

export type DurationFormat =
  | "conversation"
  | "light_coding"
  | "machine_coding";

export type ScreenShareExpectation = "optional" | "encouraged" | "expected";

export type DurationProfile = {
  id: InterviewDuration;
  minutes: number;
  label: string;
  tagline: string;
  description: string;
  maxQuestions: number;
  format: DurationFormat;
  screenShareExpectation: ScreenShareExpectation;
};

export const DURATION_PROFILES: Record<InterviewDuration, DurationProfile> = {
  minutes_15: {
    id: "minutes_15",
    minutes: 15,
    label: "15 min",
    tagline: "Conversation only",
    description:
      "Behavioral and technical discussion by voice — no live coding.",
    maxQuestions: 5,
    format: "conversation",
    screenShareExpectation: "optional",
  },
  minutes_30: {
    id: "minutes_30",
    minutes: 30,
    label: "30 min",
    tagline: "Light coding",
    description:
      "Mix of discussion plus an optional small coding or pseudo-code exercise.",
    maxQuestions: 7,
    format: "light_coding",
    screenShareExpectation: "encouraged",
  },
  minutes_60: {
    id: "minutes_60",
    minutes: 60,
    label: "60 min",
    tagline: "Full machine round",
    description:
      "A true machine-coding session with live problem solving on screen.",
    maxQuestions: 11,
    format: "machine_coding",
    screenShareExpectation: "expected",
  },
};

export function isInterviewDuration(value: unknown): value is InterviewDuration {
  return (
    typeof value === "string" &&
    (INTERVIEW_DURATIONS as readonly string[]).includes(value)
  );
}

export function getDurationProfile(
  duration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): DurationProfile {
  return DURATION_PROFILES[duration];
}

export function getMaxQuestionsForDuration(
  duration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): number {
  return getDurationProfile(duration).maxQuestions;
}

export function getDurationSeconds(
  duration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): number {
  return getDurationProfile(duration).minutes * 60;
}

export function formatDurationLabel(
  duration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): string {
  const profile = getDurationProfile(duration);
  return `${profile.label} · ${profile.tagline}`;
}

export function getLobbyHelperText(
  duration: InterviewDuration = DEFAULT_INTERVIEW_DURATION,
): string {
  const profile = getDurationProfile(duration);
  switch (profile.screenShareExpectation) {
    case "expected":
      return "Plan to share your screen for live coding. Microphone is required; camera is optional.";
    case "encouraged":
      return "Your microphone is required. Screen share is optional but helpful if you want a light coding exercise.";
    default:
      return "Your microphone is required for this voice interview. Camera and screen share are optional.";
  }
}

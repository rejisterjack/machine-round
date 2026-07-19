import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import {
  getConversationPhase,
  getPhaseGuidance,
  getVarietyStyle,
} from "@/lib/ai/conversation-phases";
import { MAX_QUESTIONS } from "@/lib/design/tokens";
import {
  DEFAULT_INTERVIEW_DURATION,
  getDurationProfile,
  type InterviewDuration,
} from "@/lib/interview/duration-profiles";
import {
  allowsBehavioral,
  buildInterviewScopeBlock,
  getCourseInterviewScope,
} from "@/lib/courses/interview-scope";

const JSON_RESPONSE_SHAPE = `Respond in JSON only with this shape:
{
  "message": "your next question or closing line",
  "speaker": "akshay" or "archy",
  "done": false,
  "referencedAnswer": "short quote or paraphrase from prior answer when applicable",
  "topicsCovered": ["topic1", "topic2"],
  "weakSignals": ["optional weak signals noticed"]
}`;

function buildTextSharedRules(maxQuestions: number, behavioral: boolean) {
  return `- Ask one question at a time (or a brief closing line when done).
${behavioral ? "- Mix behavioral and technical questions appropriate to the candidate role." : "- Ask only technical questions within the strict interview scope. No behavioral, resume, or career questions."}
- After the first question, every follow-up MUST reference something specific from the candidate's previous answer.
- Evaluate clarity, specificity, structure, technical correctness signal, and conciseness internally.
- Keep questions focused and interview-realistic. No coaching during the interview.
- When enough questions have been asked (max ${maxQuestions}), set done to true and give a brief closing line.`;
}

const VOICE_CONVERSATION_RULES = `You are on a live video call. Sound like a real human interviewer from India — not a chatbot or quiz app.

Accent and delivery:
- Natural Indian English — warm, clear, conversational.
- Use Indian English rhythm where it fits; avoid a flat broadcast accent.

Voice rules:
- Speak naturally with contractions and brief reactions when genuine.
- One main question per turn.
- Never say "as an AI", never mention JSON, never lecture.
- Never use robotic prefixes like "Akshay here —" or "Archy here —".
- Never say "it's my turn", never correct the candidate about who should speak.
- Reference what they said when it fits — do not force a formula every time.
- If unclear, ask a gentle clarifier.
- On closing: thank them warmly; mention their readiness report is next.
- Never end the interview without a clear goodbye — do not stop mid-question.
- If a [System] message appears, speak the requested phrase naturally and briefly.
- Stay on one question until the candidate has answered; use follow-ups on the same topic before moving on — do not stack multiple new questions in one turn.
- Keep each turn under ~45 seconds of speech.
- Vary your phrasing across interviews — do not repeat the same opener or filler every time.`;

function buildFormatGuidance(
  interviewDuration: InterviewDuration,
  strictCourseMode: boolean,
): string {
  const profile = getDurationProfile(interviewDuration);
  const discussionFocus =
    strictCourseMode ?
      "syllabus-aligned technical discussion"
    : "behavioral and technical discussion";
  switch (profile.format) {
    case "conversation":
      return `Session format (${profile.label} — ${profile.tagline}):
- Keep this a voice conversation. Do not ask the candidate to write or share code.
- Focus on ${discussionFocus} appropriate to ${profile.minutes} minutes.`;
    case "light_coding":
      return `Session format (${profile.label} — ${profile.tagline}):
- Mix discussion with at most one light coding or pseudo-code question.
- Screen share is optional — ask before assuming they are coding live.`;
    case "machine_coding":
      return `Session format (${profile.label} — ${profile.tagline}):
- Treat this as a full machine round over ${profile.minutes} minutes.
- Early in explore phase, ask them to share screen and work through a problem live.
- Follow visible code on screen and ask follow-ups about approach, bugs, and tradeoffs.`;
    default:
      return "";
  }
}

function buildTextDualPanelRules(maxQuestions: number, behavioral: boolean) {
  return `You are co-hosting Namaste Machine Round as a two-person panel with Akshay Saini and Archy Gupta from NamasteDev.

Panel rules:
- Only the ACTIVE panelist speaks this turn. Do not speak as the other panelist.
${buildTextSharedRules(maxQuestions, behavioral)}

${JSON_RESPONSE_SHAPE}`;
}

function textSoloPanelRules(
  panelistName: string,
  maxQuestions: number,
  behavioral: boolean,
): string {
  return `You are conducting Namaste Machine Round as ${panelistName} from NamasteDev.

Interview rules:
- You are the sole interviewer. Speak only as yourself.
${buildTextSharedRules(maxQuestions, behavioral)}

${JSON_RESPONSE_SHAPE}`;
}

function buildVoiceDualPanelRules() {
  return `You are co-hosting Namaste Machine Round on a live video call with Akshay Saini and Archy Gupta from NamasteDev.

Panel rules:
- Only the ACTIVE panelist speaks this turn. The other is listening in the same room.
- If you asked the previous question, you own the follow-up until that topic is explored — do not let your co-panelist interrupt your thread.
- Pass the mic naturally only when your co-panelist is better suited and the current thread is done — never announce turns or correct the candidate.
- Both panelists are present; reference each other by first name only when a handoff feels natural.
${VOICE_CONVERSATION_RULES}`;
}

function voiceSoloPanelRules(panelistName: string): string {
  return `You are conducting Namaste Machine Round on a live video call as ${panelistName} from NamasteDev.

${VOICE_CONVERSATION_RULES}`;
}

function buildTrackContext(input: {
  courseId?: string;
  promptContext?: string;
}): string {
  return buildInterviewScopeBlock(input.courseId, input.promptContext);
}

function resolveInterviewScope(input: {
  courseId?: string;
  promptContext?: string;
}) {
  return getCourseInterviewScope(input.courseId, input.promptContext);
}

function buildTextPrompt(input: {
  role: string;
  questionCount: number;
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
  sessionId?: string;
  interviewDuration: InterviewDuration;
  maxQuestions: number;
  courseId?: string;
  promptContext?: string;
}) {
  const panelist = getPanelist(input.activePanelist);
  const scope = resolveInterviewScope(input);
  const behavioral = allowsBehavioral(scope);
  const phase = getConversationPhase(input.questionCount, input.maxQuestions);
  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
    varietyStyle: input.sessionId
      ? getVarietyStyle(input.sessionId)
      : undefined,
    interviewScope: scope,
  });

  const baseRules =
    input.panelistMode === "both"
      ? buildTextDualPanelRules(input.maxQuestions, behavioral)
      : textSoloPanelRules(panelist.name, input.maxQuestions, behavioral);

  return `${baseRules}

Role: ${input.role}
Session length: ${getDurationProfile(input.interviewDuration).label}
Questions asked so far: ${input.questionCount}
Maximum questions: ${input.maxQuestions}
Active panelist this turn: ${panelist.name} (${panelist.id})
Phase: ${phase}
Turn guidance: ${phaseGuidance}

${buildFormatGuidance(input.interviewDuration, scope?.strictCourseMode ?? false)}
${buildTrackContext(input)}

${panelist.persona}

You MUST set "speaker" to "${panelist.id}" in your JSON response.`;
}

function buildVoicePrompt(input: {
  role: string;
  questionCount: number;
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
  screenReviewEnabled?: boolean;
  cameraReviewEnabled?: boolean;
  sessionId?: string;
  interviewDuration: InterviewDuration;
  maxQuestions: number;
  courseId?: string;
  promptContext?: string;
}) {
  const panelist = getPanelist(input.activePanelist);
  const profile = getDurationProfile(input.interviewDuration);
  const scope = resolveInterviewScope(input);
  const phase = getConversationPhase(input.questionCount, input.maxQuestions);
  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
    varietyStyle: input.sessionId
      ? getVarietyStyle(input.sessionId)
      : undefined,
    interviewScope: scope,
  });

  const baseRules =
    input.panelistMode === "both"
      ? buildVoiceDualPanelRules()
      : voiceSoloPanelRules(panelist.name);

  const screenNote = input.screenReviewEnabled
    ? `\nScreen share is live. Fresh screen images are pushed into this conversation as the candidate's screen changes. When screen images are present, answer visual questions from the most recent image — not older text summaries. [Screen context] messages add structured facts on user turns; prefer Site, URL, Cursor, and Overlays fields literally. Track live code edits, modals, popups, and error dialogs from the latest frame. If confidence is low, say you are not fully sure what page this is. Do not say you cannot see their screen while sharing is active. React naturally and ask follow-ups about visible code, approach, bugs, or tradeoffs.`
    : profile.screenShareExpectation === "expected"
      ? `\nScreen share is not active yet. For this ${profile.label} machine round, ask the candidate to share their screen when you move into live coding.`
      : "";

  const cameraNote = input.cameraReviewEnabled
    ? `\nThe candidate's camera is on. Fresh camera images are pushed into this conversation. Answer questions about their face, hands, fingers, gestures, or objects they show on camera from the most recent camera image. Count fingers only when you can clearly see them; if the image is unclear, say what you can and cannot see instead of guessing.`
    : "";

  const openingNote =
    input.questionCount === 0
      ? "\nFirst turn of the call — greet and set context. Use fresh wording, not a memorized script."
      : "";

  return `${baseRules}

Role: ${input.role}
Session length: ${profile.label} (${profile.tagline})
Questions asked so far: ${input.questionCount}
Maximum questions: ${input.maxQuestions}
Active panelist this turn: ${panelist.name}
Conversation phase: ${phase}
Phase guidance: ${phaseGuidance}

${buildFormatGuidance(input.interviewDuration, scope?.strictCourseMode ?? false)}
${buildTrackContext(input)}

${panelist.persona}
${screenNote}
${cameraNote}
${openingNote}

This is a live voice turn. Respond with spoken words only — no JSON, no markdown.`;
}

export function buildInterviewerPrompt(input: {
  role: string;
  questionCount: number;
  activePanelist: PanelistId;
  panelistMode?: PanelistMode;
  forVoice?: boolean;
  screenReviewEnabled?: boolean;
  cameraReviewEnabled?: boolean;
  sessionId?: string;
  interviewDuration?: InterviewDuration;
  maxQuestions?: number;
  courseId?: string;
  promptContext?: string;
}) {
  const panelistMode = input.panelistMode ?? "both";
  const interviewDuration = input.interviewDuration ?? DEFAULT_INTERVIEW_DURATION;
  const maxQuestions =
    input.maxQuestions ?? getDurationProfile(interviewDuration).maxQuestions;

  if (input.forVoice) {
    return buildVoicePrompt({
      role: input.role,
      questionCount: input.questionCount,
      activePanelist: input.activePanelist,
      panelistMode,
      screenReviewEnabled: input.screenReviewEnabled,
      cameraReviewEnabled: input.cameraReviewEnabled,
      sessionId: input.sessionId,
      interviewDuration,
      maxQuestions,
      courseId: input.courseId,
      promptContext: input.promptContext,
    });
  }

  return buildTextPrompt({
    role: input.role,
    questionCount: input.questionCount,
    activePanelist: input.activePanelist,
    panelistMode,
    sessionId: input.sessionId,
    interviewDuration,
    maxQuestions,
    courseId: input.courseId,
    promptContext: input.promptContext,
  });
}

/** @deprecated Use buildInterviewerPrompt with activePanelist */
export const INTERVIEWER_SYSTEM_PROMPT = buildTextDualPanelRules(MAX_QUESTIONS, true);

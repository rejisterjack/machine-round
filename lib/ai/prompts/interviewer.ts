import {
  getPanelist,
  type PanelistId,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import {
  getConversationPhase,
  getPhaseGuidance,
} from "@/lib/ai/conversation-phases";
import { MAX_QUESTIONS } from "@/lib/design/tokens";

const JSON_RESPONSE_SHAPE = `Respond in JSON only with this shape:
{
  "message": "your next question or closing line",
  "speaker": "akshay" or "archy",
  "done": false,
  "referencedAnswer": "short quote or paraphrase from prior answer when applicable",
  "topicsCovered": ["topic1", "topic2"],
  "weakSignals": ["optional weak signals noticed"]
}`;

const TEXT_SHARED_RULES = `- Ask one question at a time (or a brief closing line when done).
- Mix behavioral and technical questions appropriate to the candidate role.
- After the first question, every follow-up MUST reference something specific from the candidate's previous answer.
- Evaluate clarity, specificity, structure, technical correctness signal, and conciseness internally.
- Keep questions focused and interview-realistic. No coaching during the interview.
- When enough questions have been asked (max ${MAX_QUESTIONS}), set done to true and give a brief closing line.`;

const VOICE_CONVERSATION_RULES = `You are on a live video call. Sound like a real human interviewer — not a chatbot or quiz app.

Voice rules:
- Speak naturally: use contractions, brief reactions ("okay", "got it", "sure", "interesting", "right", "hmm").
- Start with acknowledgment when it fits — you don't always need to jump straight to a new question.
- One main question per turn. Short reactions plus one question is perfect.
- Never say "as an AI", never mention JSON, never lecture or list multiple questions.
- Never use robotic prefixes like "Akshay here —" or "Archy here —".
- Reference what they said organically when it fits — don't force a formulaic callback every time.
- If their answer was unclear, ask a gentle clarifier ("can you walk me through that?" / "what was your role in that?").
- On panel handoff turns: brief banter with your co-panelist, then one focused question.
- On closing: thank them warmly, mention their readiness report is next.
- Keep each turn under ~45 seconds of speech.`;

const TEXT_DUAL_PANEL_RULES = `You are co-hosting Namaste Machine Round as a two-person panel with Akshay Saini and Archy Gupta from NamasteDev.

Panel rules:
- Only the ACTIVE panelist speaks this turn. Do not speak as the other panelist.
- Prefix naturally once per turn: "Akshay here —" or "Archy here —" (use your own name).
- You may briefly acknowledge the other panelist's last question, but only the active panelist asks.
${TEXT_SHARED_RULES}

${JSON_RESPONSE_SHAPE}`;

function textSoloPanelRules(panelistName: string): string {
  return `You are conducting Namaste Machine Round as ${panelistName} from NamasteDev.

Interview rules:
- You are the sole interviewer. Speak only as yourself.
- Prefix naturally once per turn with your name when helpful.
${TEXT_SHARED_RULES}

${JSON_RESPONSE_SHAPE}`;
}

const VOICE_DUAL_PANEL_RULES = `You are co-hosting Namaste Machine Round on a live video call with Akshay Saini and Archy Gupta from NamasteDev.

Panel rules:
- Only the ACTIVE panelist speaks this turn. Do not voice both people.
- You are in the same room — reference each other by first name naturally when handing off.
- On handoff turns: brief verbal pass-the-mic ("Archy, want to dig into the technical side?" / "Thanks Akshay — on that caching point…").
${VOICE_CONVERSATION_RULES}`;

function voiceSoloPanelRules(panelistName: string): string {
  return `You are conducting Namaste Machine Round on a live video call as ${panelistName} from NamasteDev.

${VOICE_CONVERSATION_RULES}`;
}

function buildTextPrompt(input: {
  role: string;
  questionCount: number;
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
}) {
  const panelist = getPanelist(input.activePanelist);
  const phase = getConversationPhase(input.questionCount);
  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
  });

  const baseRules =
    input.panelistMode === "both"
      ? TEXT_DUAL_PANEL_RULES
      : textSoloPanelRules(panelist.name);

  return `${baseRules}

Role: ${input.role}
Questions asked so far: ${input.questionCount}
Maximum questions: ${MAX_QUESTIONS}
Active panelist this turn: ${panelist.name} (${panelist.id})
Phase: ${phase}
Turn guidance: ${phaseGuidance}

${panelist.persona}

You MUST set "speaker" to "${panelist.id}" in your JSON response.`;
}

function buildVoicePrompt(input: {
  role: string;
  questionCount: number;
  activePanelist: PanelistId;
  panelistMode: PanelistMode;
  screenReviewEnabled?: boolean;
}) {
  const panelist = getPanelist(input.activePanelist);
  const phase = getConversationPhase(input.questionCount);
  const phaseGuidance = getPhaseGuidance({
    phase,
    role: input.role,
    questionCount: input.questionCount,
    panelistMode: input.panelistMode,
    activePanelist: input.activePanelist,
  });

  const baseRules =
    input.panelistMode === "both"
      ? VOICE_DUAL_PANEL_RULES
      : voiceSoloPanelRules(panelist.name);

  const screenNote = input.screenReviewEnabled
    ? `\nScreen share is active. When [Screen update] context arrives, react naturally and ask follow-ups about visible code, approach, bugs, or tradeoffs — like a real interviewer watching their IDE.`
    : "";

  const openingNote =
    input.questionCount === 0
      ? "\nThis is your first turn — greet them, set context, and ease in. Do not grill them immediately."
      : "";

  return `${baseRules}

Role: ${input.role}
Questions asked so far: ${input.questionCount}
Maximum questions: ${MAX_QUESTIONS}
Active panelist this turn: ${panelist.name}
Conversation phase: ${phase}
Phase guidance: ${phaseGuidance}

${panelist.persona}
${screenNote}
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
}) {
  const panelistMode = input.panelistMode ?? "both";

  if (input.forVoice) {
    return buildVoicePrompt({
      role: input.role,
      questionCount: input.questionCount,
      activePanelist: input.activePanelist,
      panelistMode,
      screenReviewEnabled: input.screenReviewEnabled,
    });
  }

  return buildTextPrompt({
    role: input.role,
    questionCount: input.questionCount,
    activePanelist: input.activePanelist,
    panelistMode,
  });
}

/** @deprecated Use buildInterviewerPrompt with activePanelist */
export const INTERVIEWER_SYSTEM_PROMPT = TEXT_DUAL_PANEL_RULES;

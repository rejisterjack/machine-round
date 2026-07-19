export const PANELIST_IDS = ["akshay", "archy"] as const;

export type PanelistId = (typeof PANELIST_IDS)[number];

export const PANELIST_MODES = ["akshay", "archy", "both"] as const;

export type PanelistMode = (typeof PANELIST_MODES)[number];

export type Panelist = {
  id: PanelistId;
  name: string;
  shortName: string;
  voice: string;
  avatarFallback: string;
  imageUrl?: string;
  accentColor: string;
  focus: string[];
  persona: string;
};

export const PANELISTS: Record<PanelistId, Panelist> = {
  akshay: {
    id: "akshay",
    name: "Akshay Saini",
    shortName: "Akshay",
    voice: "cedar",
    avatarFallback: "AS",
    imageUrl: "/brand/panelists/akshay-saini.png",
    accentColor: "#E58C33",
    focus: ["communication", "behavioral", "ownership", "product impact"],
    persona: `You are Akshay Saini — NamasteDev founder, seasoned engineer, and mentor.
Your interview style:
- Communication and clarity are your superpower lenses. Probe how candidates explain tradeoffs to managers and teammates.
- Care about fundamentals and adaptability over framework buzzwords. Ask what outcome shipping created.
- Warm, direct, anecdotal tone — vary your phrasing; never sound scripted.
- Behavioral and career judgment: intentional growth, teamwork, under-commit/over-deliver, consistency.
- If an answer is vague, push for structure and a concrete example.

Never:
- Repeat the same greeting or filler phrases every interview.
- Say "it's my turn" or correct the candidate about who should speak.
- Read lines from a script or list multiple questions at once.`,
  },
  archy: {
    id: "archy",
    name: "Archy Gupta",
    shortName: "Archy",
    voice: "sage",
    avatarFallback: "AG",
    imageUrl: "/brand/panelists/archy-gupta.png",
    accentColor: "#4A9FD4",
    focus: ["DSA", "technical depth", "structured prep", "concrete examples"],
    persona: `You are Archy Gupta — software engineer at Google, known for her tier-3-to-FAANG journey.
Your interview style:
- Practical, empathetic, but thorough on technical depth. Relatable to candidates grinding DSA.
- Probe problem structure, complexity, and whether answers would survive a coding round.
- Encouraging tone with follow-ups tied to what they actually said — vary your wording.
- Ask about validation, tradeoffs, and how they break problems down.

Never:
- Repeat the same greeting or filler phrases every interview.
- Say "it's my turn" or correct the candidate about who should speak.
- Read lines from a script or list multiple questions at once.`,
  },
};

export const PANELIST_ORDER: PanelistId[] = ["akshay", "archy"];

export function getPanelist(id: PanelistId): Panelist {
  return PANELISTS[id];
}

export function getPanelistForQuestion(
  questionIndex: number,
  mode: PanelistMode = "both",
): Panelist {
  if (mode === "akshay") return PANELISTS.akshay;
  if (mode === "archy") return PANELISTS.archy;
  return PANELIST_ORDER[questionIndex % PANELIST_ORDER.length] === "akshay"
    ? PANELISTS.akshay
    : PANELISTS.archy;
}

export function getActivePanelists(mode: PanelistMode): PanelistId[] {
  if (mode === "both") return [...PANELIST_ORDER];
  return [mode];
}

export function getPanelistModeLabel(mode: PanelistMode): string {
  switch (mode) {
    case "akshay":
      return "Akshay Saini";
    case "archy":
      return "Archy Gupta";
    case "both":
      return "Akshay Saini & Archy Gupta";
  }
}

export function isPanelistMode(value: string): value is PanelistMode {
  return PANELIST_MODES.includes(value as PanelistMode);
}

export function isPanelistId(value: string): value is PanelistId {
  return PANELIST_IDS.includes(value as PanelistId);
}

export function formatMessageSpeaker(
  message: { role: string; content: string; speaker?: PanelistId },
): string {
  if (message.role === "user") return `candidate: ${message.content}`;
  const speaker = message.speaker ?? "akshay";
  return `${speaker}: ${message.content}`;
}

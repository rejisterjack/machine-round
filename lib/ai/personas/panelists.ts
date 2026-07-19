export const PANELIST_IDS = ["akshay", "archy"] as const;

export type PanelistId = (typeof PANELIST_IDS)[number];

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
    voice: "echo",
    avatarFallback: "AS",
    imageUrl: "/brand/panelists/akshay-saini.png",
    accentColor: "#E58C33",
    focus: ["communication", "behavioral", "ownership", "product impact"],
    persona: `You are Akshay Saini — NamasteDev founder, seasoned engineer, and mentor.
Your interview style:
- Communication and clarity are your superpower lenses. Probe how candidates explain tradeoffs to managers and teammates.
- Care about fundamentals and adaptability over framework buzzwords. Ask what outcome shipping created.
- Warm, direct, anecdotal tone: "walk me through…", "what changed for the business?", "how did you show ownership?"
- Behavioral and career judgment: intentional growth, teamwork, under-commit/over-deliver, consistency.
- You believe great engineers communicate well — if an answer is vague, push for structure and a concrete example.`,
  },
  archy: {
    id: "archy",
    name: "Archy Gupta",
    shortName: "Archy",
    voice: "shimmer",
    avatarFallback: "AG",
    imageUrl: "/brand/panelists/archy-gupta.png",
    accentColor: "#4A9FD4",
    focus: ["DSA", "technical depth", "structured prep", "concrete examples"],
    persona: `You are Archy Gupta — software engineer at Google, known for her tier-3-to-FAANG journey.
Your interview style:
- Practical, empathetic, but thorough on technical depth. Relatable to candidates grinding DSA.
- Probe arrays, trees, graphs, DP, two-pointer, sliding window — ask candidates to break problems down step by step.
- Push for structure, specificity, and whether answers would survive a coding round.
- Encouraging tone with concrete follow-ups tied to prior answers: "you mentioned X — how would you optimize that?"
- Ask about time management, preparation habits, and how they validate their approach.`,
  },
};

export const PANELIST_ORDER: PanelistId[] = ["akshay", "archy"];

export function getPanelist(id: PanelistId): Panelist {
  return PANELISTS[id];
}

export function getPanelistForQuestion(questionIndex: number): Panelist {
  return PANELIST_ORDER[questionIndex % PANELIST_ORDER.length] === "akshay"
    ? PANELISTS.akshay
    : PANELISTS.archy;
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

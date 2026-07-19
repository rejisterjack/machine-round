import {
  getNamasteCourse,
  type NamasteCourse,
  type NamasteCourseId,
} from "@/lib/courses/namaste-courses";

export type InterviewScope = {
  title: string;
  allowedTopics: string[];
  forbiddenTopics: string[];
  focusBlock: string;
  allowsBehavioral: boolean;
  strictCourseMode: boolean;
};

const DEFAULT_FORBIDDEN_TOPICS = [
  "personal projects",
  "past work experience",
  "resume walkthrough",
  "career goals",
  "why this company",
  "company culture",
  "team fit",
  "salary expectations",
  "tell me about yourself (background)",
];

const BEHAVIORAL_COURSE_IDS = new Set<NamasteCourseId>([
  "namaste-interview",
]);

function mergeUniqueTopics(topics: string[]): string[] {
  return [...new Set(topics.filter(Boolean))];
}

function buildBundleScope(bundle: NamasteCourse): InterviewScope {
  const children = (bundle.bundleCourseIds ?? [])
    .map((id) => getNamasteCourse(id))
    .filter((course): course is NamasteCourse => Boolean(course));

  const allowedTopics = mergeUniqueTopics([
    ...bundle.topicAreas,
    ...children.flatMap((child) => child.topicAreas),
  ]);

  const childFocus = children
    .map((child) => `- ${child.title}: ${child.promptFocus}`)
    .join("\n");

  return {
    title: bundle.title,
    allowedTopics,
    forbiddenTopics: DEFAULT_FORBIDDEN_TOPICS,
    focusBlock: [
      bundle.promptFocus,
      "This bundle interview must stay within the combined syllabus of:",
      childFocus,
      "ONLY ask questions from these bundled courses. NEVER drift into unrelated stacks or generic career chat.",
    ].join("\n"),
    allowsBehavioral: false,
    strictCourseMode: true,
  };
}

function buildCourseScope(course: NamasteCourse): InterviewScope {
  const allowsBehavioral = BEHAVIORAL_COURSE_IDS.has(course.id);

  if (course.kind === "bundle") {
    return buildBundleScope(course);
  }

  return {
    title: course.title,
    allowedTopics: course.topicAreas,
    forbiddenTopics: allowsBehavioral ? [] : (course.forbiddenTopics ?? DEFAULT_FORBIDDEN_TOPICS),
    focusBlock: course.promptFocus,
    allowsBehavioral,
    strictCourseMode: !allowsBehavioral && course.id !== "job-custom",
  };
}

export function getCourseInterviewScope(
  courseId?: string,
  promptContext?: string,
): InterviewScope | null {
  if (promptContext?.trim()) {
    return {
      title: "Custom interview round",
      allowedTopics: [],
      forbiddenTopics: [],
      focusBlock: promptContext.trim(),
      allowsBehavioral: /\bbehavioral\b/i.test(promptContext),
      strictCourseMode: true,
    };
  }

  if (!courseId) return null;

  const course = getNamasteCourse(courseId);
  if (!course || course.id === "job-custom") return null;

  return buildCourseScope(course);
}

export function allowsBehavioral(scope: InterviewScope | null): boolean {
  return scope?.allowsBehavioral ?? false;
}

export function buildInterviewScopeBlock(
  courseId?: string,
  promptContext?: string,
): string {
  const scope = getCourseInterviewScope(courseId, promptContext);
  if (!scope) return "";

  const allowed =
    scope.allowedTopics.length > 0
      ? scope.allowedTopics.join(", ")
      : "topics defined in the round focus below";

  const forbidden =
    scope.forbiddenTopics.length > 0
      ? scope.forbiddenTopics.join(", ")
      : "none beyond off-topic drift";

  const lines = [
    `STRICT INTERVIEW SCOPE — ${scope.title}`,
    `ALLOWED TOPICS: ${allowed}`,
    scope.strictCourseMode
      ? `FORBIDDEN: ${forbidden}`
      : "Behavioral and technical frontend interview mix is allowed.",
    scope.focusBlock,
    scope.strictCourseMode
      ? "Every question MUST test knowledge from this scope only. If the candidate goes off-topic, redirect politely back to the syllabus."
      : "Keep questions aligned with frontend interview preparation.",
  ];

  return `\n${lines.join("\n")}`;
}

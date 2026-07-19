import type { RoleSlug } from "@/generated/client";

export type CourseTier = "premium" | "free" | "bundle";

export type NamasteCourseId =
  | "namaste-dsa"
  | "namaste-react"
  | "namaste-node"
  | "namaste-frontend-system-design"
  | "namaste-javascript"
  | "namaste-interview"
  | "mern-stack-bundle"
  | "frontend-master-bundle"
  | "advanced-fullstack-bundle"
  | "job-custom";

export type NamasteCourse = {
  id: NamasteCourseId;
  slug: RoleSlug;
  /** Exact title as shown on namastedev.com/learn */
  title: string;
  /** Exact card description from namastedev.com/learn */
  description: string;
  imageUrl: string;
  rating?: number;
  language: string;
  href: string;
  tier: CourseTier;
  icon: string;
  promptFocus: string;
  topicAreas: string[];
  kind: "course" | "bundle";
  bundleCourseIds?: NamasteCourseId[];
  forbiddenTopics?: string[];
};

const CDN = "https://do6gp1uxl3luu.cloudfront.net/banner+and+logos";

/**
 * Courses and bundles sold on https://namastedev.com/learn
 * (excludes Coming Soon, Create Your Own Bundle, and partner listings)
 */
export const NAMASTE_COURSES: NamasteCourse[] = [
  {
    id: "namaste-dsa",
    slug: "namaste_dsa",
    title: "Namaste DSA",
    description:
      "Master Data Structures and Algorithms with Namaste DSA hands-on coding, clear explanations, and real-world problem-solving.",
    imageUrl: `${CDN}/namaste-dsa-banner.webp`,
    rating: 4.9,
    language: "English",
    href: "https://namastedev.com/learn/namaste-dsa",
    tier: "premium",
    icon: "Binary",
    kind: "course",
    promptFocus:
      "ONLY ask DSA interview questions: time/space complexity, arrays, strings, hashing, stacks, queues, trees, graphs, recursion, and dynamic programming. Use verbal or light pseudo-code problems. NEVER ask about personal projects, resume, or career background.",
    topicAreas: ["arrays", "trees", "graphs", "DP", "complexity analysis", "hashing", "recursion"],
  },
  {
    id: "namaste-node",
    slug: "namaste_node",
    title: "Namaste Node.js",
    description:
      "From basics to advanced concepts, gain experience in building applications.",
    imageUrl: `${CDN}/namaste-node-banner.webp`,
    rating: 4.8,
    language: "English",
    href: "https://namastedev.com/learn/namaste-node",
    tier: "premium",
    icon: "Server",
    kind: "course",
    promptFocus:
      "ONLY ask Node.js and backend questions: Express/API design, middleware, async patterns, event loop, databases, caching, auth, error handling, and scaling Node services. NEVER ask about personal projects, resume, or unrelated frontend trivia.",
    topicAreas: ["APIs", "async", "databases", "auth", "scaling", "event loop"],
  },
  {
    id: "namaste-frontend-system-design",
    slug: "namaste_frontend_system_design",
    title: "Namaste Frontend System Design",
    description: "Go from Zero to Hero in Frontend System Design",
    imageUrl: `${CDN}/namaste-fsd-banner.webp`,
    rating: 4.8,
    language: "English",
    href: "https://namastedev.com/learn/namaste-frontend-system-design",
    tier: "premium",
    icon: "Layout",
    kind: "course",
    promptFocus:
      "ONLY ask frontend system design questions: component architecture, state at scale, rendering strategies (SSR/CSR/ISR), API integration, caching, real-time UI, accessibility, performance budgets, and complex product surfaces. NEVER ask resume or personal project stories.",
    topicAreas: ["architecture", "SSR", "performance", "real-time UI", "caching", "state at scale"],
  },
  {
    id: "namaste-react",
    slug: "namaste_react",
    title: "Namaste React",
    description:
      "Join our Namaste React Webseries to master React.js. Learn from the ground up and build real-world apps with ease.",
    imageUrl: `${CDN}/namaste-react-banner-hd.webp`,
    rating: 4.7,
    language: "English",
    href: "https://namastedev.com/learn/namaste-react",
    tier: "premium",
    icon: "Atom",
    kind: "course",
    promptFocus:
      "ONLY ask React interview questions: component design, hooks, state management, rendering behavior, reconciliation, performance (memo, useMemo, useCallback), data fetching patterns, and debugging UI issues. NEVER ask about personal projects or career background.",
    topicAreas: ["hooks", "state", "rendering", "performance", "patterns", "reconciliation"],
  },
  {
    id: "namaste-javascript",
    slug: "namaste_javascript",
    title: "Namaste JavaScript",
    description:
      "Namaste JavaScript is a pure in-depth JavaScript Course released for Free.",
    imageUrl: `${CDN}/njw.webp`,
    rating: 4.8,
    language: "English",
    href: "https://namastedev.com/learn/namaste-javascript",
    tier: "free",
    icon: "Code",
    kind: "course",
    promptFocus:
      "ONLY ask core JavaScript questions: closures, scope, `this`, prototypes, promises/async-await, event loop, ES6+ features, hoisting, and tricky output-based questions. NEVER ask about React, Node, personal projects, resume, career goals, or opinions unrelated to the JS language.",
    topicAreas: ["closures", "scope", "async", "prototypes", "event loop", "this", "hoisting", "ES6+"],
  },
  {
    id: "namaste-interview",
    slug: "namaste_interview",
    title: "Crack Frontend Interview",
    description:
      "Your comprehensive guide to mastering JavaScript frontend interviews.",
    imageUrl: `${CDN}/crack_frontend_interview.png`,
    rating: 4.8,
    language: "English",
    href: "https://namastedev.com/learn/namaste-interview",
    tier: "free",
    icon: "Target",
    kind: "course",
    promptFocus:
      "Focus on frontend interview prep: JS fundamentals, DOM, CSS layout, React basics, debugging, and communication under pressure. Mix behavioral and technical like a real frontend screen.",
    topicAreas: ["JS", "DOM", "CSS", "React", "debugging"],
  },
  {
    id: "mern-stack-bundle",
    slug: "mern_stack_bundle",
    title: "MERN Stack Bundle",
    description:
      "Master the most demanded job ready stack in the industry. Learn from basics to advanced concepts of MongoDB, Express, React and Node. Gain hands-on experience and build scalable, high-performance applications.",
    imageUrl: `${CDN}/mernstack.webp`,
    language: "English",
    href: "https://namastedev.com/learn/namaste-react--namaste-node",
    tier: "bundle",
    icon: "Layers",
    kind: "bundle",
    promptFocus:
      "ONLY ask MERN full-stack technical questions across React UI, Node/Express APIs, MongoDB modeling, auth, and end-to-end feature design. NEVER ask personal project stories or career background unless directly needed to explain a technical choice.",
    topicAreas: ["React", "Node", "MongoDB", "Express", "full-stack", "auth"],
    bundleCourseIds: ["namaste-react", "namaste-node"],
  },
  {
    id: "frontend-master-bundle",
    slug: "frontend_master_bundle",
    title: "Frontend Master Bundle",
    description:
      "Become a PRO frontend developer by mastering React.js and frontend system design. Learn the advanced frontend skills and techniques asked in the interviews for frontend engineers. Build scalable, high-performance applications.",
    imageUrl: `${CDN}/frontend.webp`,
    language: "English",
    href: "https://namastedev.com/learn/namaste-react--namaste-frontend-system-design",
    tier: "bundle",
    icon: "Monitor",
    kind: "bundle",
    promptFocus:
      "ONLY ask questions from React depth and frontend system design: scalable UI architecture, performance, rendering, and complex product surfaces. NEVER ask unrelated backend-only trivia or personal career stories.",
    topicAreas: ["React", "FSD", "performance", "architecture", "SSR"],
    bundleCourseIds: ["namaste-react", "namaste-frontend-system-design"],
  },
  {
    id: "advanced-fullstack-bundle",
    slug: "advanced_fullstack_bundle",
    title: "Advanced FullStack Bundle",
    description:
      "Become a highly skilled full stack developer by mastering the most demanded skills which are React, node and frontend system design. Build scalable, high-performance server-side apps, by mastering the essential skills.",
    imageUrl: `${CDN}/fullstack.webp`,
    language: "English",
    href: "https://namastedev.com/learn/namaste-react--namaste-node--namaste-frontend-system-design",
    tier: "bundle",
    icon: "Layers",
    kind: "bundle",
    promptFocus:
      "ONLY ask advanced full-stack technical questions spanning React, Node, and frontend system design — APIs, UI architecture, performance, and delivery tradeoffs. NEVER ask personal project stories or generic behavioral questions.",
    topicAreas: ["full-stack", "React", "Node", "FSD", "APIs", "architecture"],
    bundleCourseIds: [
      "namaste-react",
      "namaste-node",
      "namaste-frontend-system-design",
    ],
  },
];

export const JOB_CUSTOM_COURSE: NamasteCourse = {
  id: "job-custom",
  slug: "job_custom",
  title: "Custom Job Description",
  description: "Practice rounds tailored to a job description you provide.",
  imageUrl: "/brand/roles/full-stack.webp",
  rating: 4.9,
  language: "English",
  href: "/interview",
  tier: "premium",
  icon: "FileText",
  kind: "course",
  promptFocus: "",
  topicAreas: [],
};

/** Slugs that must never appear in the course picker */
export const RETIRED_COURSE_SLUGS = [
  "namaste_ai",
  "backend_system_design",
  "full_stack",
  "backend",
  "frontend",
  "product_minded",
] as const satisfies readonly RoleSlug[];

export const CATALOG_ROLE_SLUGS = NAMASTE_COURSES.map(
  (course) => course.slug,
) as RoleSlug[];

export function getNamasteCourse(id: string): NamasteCourse | undefined {
  if (id === "job-custom") return JOB_CUSTOM_COURSE;
  return NAMASTE_COURSES.find((course) => course.id === id);
}

export function getCoursePromptFocus(courseId: string): string {
  return getNamasteCourse(courseId)?.promptFocus ?? "";
}

export function getSelectableCourses(): NamasteCourse[] {
  return NAMASTE_COURSES;
}

export function getCoursesByKind(kind: "course" | "bundle"): NamasteCourse[] {
  return NAMASTE_COURSES.filter((course) => course.kind === kind);
}

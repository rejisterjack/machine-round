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
      "Focus on DSA fundamentals: time/space complexity, arrays, strings, hashing, stacks, queues, trees, graphs, recursion, and dynamic programming. Ask coding-style questions verbally or with light pseudo-code. Probe how they approach unseen problems and optimize solutions.",
    topicAreas: ["arrays", "trees", "graphs", "DP", "complexity analysis"],
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
      "Focus on Node.js and backend interviews: Express/API design, middleware, async patterns, event loop, databases, caching, auth, error handling, and scaling Node services. Ask about tradeoffs in real backend systems.",
    topicAreas: ["APIs", "async", "databases", "auth", "scaling"],
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
      "Focus on frontend system design: component architecture, state at scale, rendering strategies (SSR/CSR/ISR), API integration, caching, real-time UI, accessibility, performance budgets, and designing complex dashboards or editors.",
    topicAreas: ["architecture", "SSR", "performance", "real-time UI"],
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
      "Focus on React interviews: component design, hooks, state management, rendering behavior, reconciliation, performance (memo, useMemo, useCallback), data fetching patterns, and debugging UI issues. Reference real app scenarios.",
    topicAreas: ["hooks", "state", "rendering", "performance", "patterns"],
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
      "Focus on core JavaScript: closures, scope, `this`, prototypes, promises/async-await, event loop, ES6+ features, and tricky output questions. Probe depth of language understanding beyond framework APIs.",
    topicAreas: ["closures", "async", "prototypes", "event loop"],
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
      "Focus on MERN full-stack interviews: React UI, Node/Express APIs, MongoDB modeling, auth, and end-to-end feature design across the stack.",
    topicAreas: ["React", "Node", "MongoDB", "full-stack"],
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
      "Combine React depth with frontend system design: scalable UI architecture, performance, and complex product surfaces.",
    topicAreas: ["React", "FSD", "performance", "architecture"],
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
      "Full-stack senior screen: API design, React architecture, frontend system design, ownership, and tradeoffs across the entire delivery stack.",
    topicAreas: ["full-stack", "React", "Node", "FSD"],
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

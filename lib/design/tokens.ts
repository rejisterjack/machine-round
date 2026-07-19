import {
  getSelectableCourses,
  JOB_CUSTOM_COURSE,
  NAMASTE_COURSES,
} from "@/lib/courses/namaste-courses";

export const ndColors = {
  bg: "#030303",
  surface: "#111111",
  surfaceElevated: "#171717",
  foreground: "#F7F4EE",
  muted: "rgba(247, 244, 238, 0.6)",
  mutedSoft: "rgba(247, 244, 238, 0.75)",
  accent: "#E58C33",
  accentGold: "#EDAE2F",
  navy: "#092A46",
  border: "rgba(247, 244, 238, 0.1)",
  userBubble: "#252525",
} as const;

/** NamasteDev course interview tracks — titles/images match namastedev.com/learn */
export const roles = getSelectableCourses().map((course) => ({
  id: course.id,
  title: course.title,
  description: course.description,
  icon: course.icon,
  imageUrl: course.imageUrl,
  rating: course.rating,
  language: course.language,
  href: course.href,
  tier: course.tier,
  kind: course.kind,
}));

export type RoleId = (typeof roles)[number]["id"];

export const MAX_QUESTIONS = 7;

export const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/namastedevofficial/",
    icon: "Instagram",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/namastedev/",
    icon: "Linkedin",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@akshaymarch7",
    icon: "Youtube",
  },
  {
    label: "Discord",
    href: "https://discord.gg/AGWng6gTxQ",
    icon: "MessageCircle",
  },
] as const;

export const appStoreLinks = [
  {
    label: "App Store",
    href: "https://apps.apple.com/in/app/namastedev-by-akshay-saini/id6752595204",
    imageUrl: "/brand/app-store.webp",
  },
  {
    label: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.namastedev.courses",
    imageUrl: "/brand/play-store.webp",
  },
] as const;

/** Footer course column — matches namastedev.com footer */
const footerCourseIds = [
  "namaste-dsa",
  "namaste-react",
  "namaste-node",
  "namaste-frontend-system-design",
  "namaste-javascript",
  "namaste-interview",
] as const;

export const footerCourseLinks = footerCourseIds.map((id) => {
  const course = NAMASTE_COURSES.find((item) => item.id === id);
  if (!course) {
    throw new Error(`Missing footer course: ${id}`);
  }

  return {
    label: id === "namaste-node" ? "Namaste Node" : course.title,
    href: course.href,
  };
});

export const footerCta = {
  headline: "Ready to Transform Your Career?",
  description:
    "Explore our course bundles designed to take you from beginner to job-ready, with skills that top companies demand.",
  buttonLabel: "EXPLORE COURSE BUNDLES",
  href: "https://namastedev.com/learn",
} as const;

/** Matches namastedev.com homepage hero */
export const heroContent = {
  eyebrow: "Learn To code. Launch Your Career.",
  lead: "Learn. Build. Grow.",
  title: "Become The Top 1% ",
  accent: "Software Engineer!",
  description:
    "Go from zero to hero, build hands-on projects, gain practical skills and the confidence to turn code into a career.",
  checklist: [
    "Frontend, backend, or full-stack mastery",
    "Solve hands-on coding challenges",
    "Get job-ready and land your dream offers",
  ],
  ctaLabel: "Explore Courses",
  ctaHref: "https://namastedev.com/learn",
  ctaExternal: true,
  imageSrc: "/brand/hero-interview.jpeg",
  imageAlt: "Akshay Saini with YouTube Silver Play Button",
} as const;

export const footerNav = {
  navigation: [
    {
      label: "Be Someone's Inspiration",
      href: "https://namastedev.com/share-your-story",
    },
    {
      label: "Interview Stories",
      href: "https://namastedev.com/interview-stories",
    },
    { label: "Courses", href: "https://namastedev.com/learn" },
    { label: "Blog", href: "https://namastedev.com/write" },
    { label: "Gift a course", href: "https://namastedev.com/gift" },
    {
      label: "Become Affiliate",
      href: "https://namastedev.com/affiliate/dashboard",
    },
    { label: "Need Help", href: "https://namastedev.com/pages/faq" },
    { label: "Free Guides", href: "https://namastedev.com/guides" },
  ],
  courses: footerCourseLinks,
  legal: [
    {
      label: "Privacy Policy",
      href: "https://namastedev.com/pages/privacy-policy",
    },
    {
      label: "Terms Of Service",
      href: "https://namastedev.com/pages/terms-of-service",
    },
    {
      label: "Refund Policy",
      href: "https://namastedev.com/pages/refunds",
    },
    { label: "Contact Us", href: "https://namastedev.com/pages/contact-us" },
    { label: "About Us", href: "https://namastedev.com/pages/about-us" },
    { label: "Team", href: "https://namastedev.com/pages/team" },
  ],
} as const;

export const whatsappUrl =
  "https://wa.me/919876543210?text=Hi%20NamasteDev%2C%20I%20have%20a%20question%20about%20Namaste%20Machine%20Round";

/** Matches namastedev.com header Explore menu */
export const exploreNavItems = [
  {
    label: "Interview Practice",
    href: "/interview",
    icon: "monitor",
  },
  {
    label: "Join Community",
    href: "https://discord.gg/AGWng6gTxQ",
    icon: "users",
  },
  {
    label: "Leaderboard",
    href: "https://namastedev.com/leaderboard",
    icon: "trophy",
  },
  {
    label: "Quizzes",
    href: "https://namastedev.com/quizzes",
    icon: "clipboard",
  },
  {
    label: "Playground",
    href: "https://namastedev.com/playground",
    icon: "code",
  },
] as const;

export const hackathonNav = {
  label: "Hackathon",
  href: "https://namastedev.com/hackathon",
  live: true,
} as const;

export const coursesNav = {
  label: "Courses",
  href: "https://namastedev.com/learn",
} as const;

export const exploreCourses = [
  ...NAMASTE_COURSES.map((course) => ({
    label: course.title,
    href: course.href,
  })),
  { label: "Namaste Machine Round", href: "/" },
] as const;

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
  courses: NAMASTE_COURSES.map((course) => ({
    label: course.title,
    href: course.href,
  })),
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

export const exploreCourses = [
  ...NAMASTE_COURSES.map((course) => ({
    label: course.title,
    href: course.href,
  })),
  { label: "Namaste Machine Round", href: "/" },
] as const;

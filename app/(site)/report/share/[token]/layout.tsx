import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Readiness Report | Namaste Machine Round",
  description:
    "View a shared Namaste Machine Round readiness report with scores, red flags, and improvement actions.",
  openGraph: {
    title: "Shared Readiness Report | Namaste Machine Round",
    description:
      "View a shared Namaste Machine Round readiness report with scores, red flags, and improvement actions.",
    type: "article",
  },
};

export default function SharedReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

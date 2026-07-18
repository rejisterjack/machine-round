import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Session Replay | Namaste Machine Round",
  description:
    "Replay a Namaste Machine Round interview session transcript and readiness report.",
};

export default function ReplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

"use client";

import dynamic from "next/dynamic";

const InterviewSessionClient = dynamic(
  () =>
    import("./interview-session-client").then((module) => ({
      default: module.InterviewSessionClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading interview room…
      </div>
    ),
  },
);

export function InterviewSessionLoader() {
  return <InterviewSessionClient />;
}

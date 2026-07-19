"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ShareActions } from "@/components/report/share-actions";

const ShareActionsDynamic = dynamic(
  () =>
    import("@/components/report/share-actions").then((module) => ({
      default: module.ShareActions,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading share actions…</p>
    ),
  },
);

export function LazyShareActions(props: ComponentProps<typeof ShareActions>) {
  return <ShareActionsDynamic {...props} />;
}

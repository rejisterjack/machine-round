import { headers } from "next/headers";
import { Suspense } from "react";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";

async function ClarityWithNonce() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <MicrosoftClarity nonce={nonce} />;
}

export function AnalyticsScripts() {
  return (
    <Suspense fallback={null}>
      <ClarityWithNonce />
    </Suspense>
  );
}

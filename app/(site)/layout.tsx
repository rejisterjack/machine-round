import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StayInformedModal } from "@/components/layout/stay-informed-modal";
import { WhatsappFab } from "@/components/layout/whatsapp-fab";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
      <Suspense fallback={null}>
        <StayInformedModal />
      </Suspense>
      <WhatsappFab />
    </>
  );
}

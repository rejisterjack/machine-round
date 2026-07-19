import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";
import { SessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Namaste Machine Round | NamasteDev",
  description:
    "Practice AI-style screening interviews with adaptive follow-ups and a structured readiness report. A NamasteDev product.",
  icons: {
    icon: "/brand/favicon.ico",
    apple: "/brand/icon.webp",
  },
  openGraph: {
    title: "Namaste Machine Round | NamasteDev",
    description:
      "Practice AI-style screening interviews with adaptive follow-ups and a structured readiness report.",
    siteName: "NamasteDev",
    type: "website",
    images: [
      {
        url: "https://do6gp1uxl3luu.cloudfront.net/assets/og-images/home-page.jpg",
        width: 1200,
        height: 630,
        alt: "NamasteDev",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-background font-sans text-foreground">
        <SessionProvider>{children}</SessionProvider>
        <MicrosoftClarity />
      </body>
    </html>
  );
}

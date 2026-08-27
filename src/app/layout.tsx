import type { Metadata } from "next";
import { IBM_Plex_Mono, Onest } from "next/font/google";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AniAuthProvider } from "@/components/auth/privy-provider";
import { AvatarProvider } from "@/components/avatar/avatar-provider";

import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

/**
 * Base for the absolute URLs in the share tags. Vercel supplies the deployment
 * host; the localhost fallback keeps the tags valid while developing. A bad
 * value in the environment degrades to localhost rather than throwing during
 * render, which would take the whole page with it.
 */
function siteUrl(): URL {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);
  if (candidate) {
    try {
      return new URL(candidate);
    } catch {
      console.warn(`Ignoring unparseable site URL: ${candidate}`);
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  openGraph: {
    siteName: "AniBot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  title: {
    default: "AniBot — The open agent for crypto",
    template: "%s · AniBot",
  },
  description:
    "An open, Web3-native agent architecture with an expressive 3D companion, live Solana and Pump.fun research tools, visible sources, and streaming voice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="en"
      className={`${onest.variable} ${plexMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AvatarProvider>
          <AniAuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AniAuthProvider>
        </AvatarProvider>
      </body>
    </html>
  );
}

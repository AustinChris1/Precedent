import type { Metadata } from "next";
import { Arvo, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Arvo: a slab serif with the weight of something printed and filed — the right
// voice for a bureau that publishes findings.
const display = Arvo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Manrope carries the interface.
const sans = Manrope({
  variable: "--font-sans-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Precedent — underwriting for agent-to-agent commerce",
  description:
    "A credit bureau for AI agents. Precedent probes live agents, remembers how they actually behaved, and prices every future job from that record.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // we set scroll-behavior: smooth in globals.css; this tells Next to skip
      // smooth scrolling during route transitions (silences its dev warning)
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}

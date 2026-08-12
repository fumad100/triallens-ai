import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrialLens AI — Evidence-grounded development decisions",
  description: "Search live clinical trials and scientific literature in a traceable drug-development evidence workspace.",
  metadataBase: new URL("https://triallens-ai-evidence.fmahamud16.chatgpt.site"),
  openGraph: {
    title: "TrialLens AI",
    description: "Evidence first. Decisions with a source trail.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TrialLens AI — Evidence first. Decisions with a source trail." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrialLens AI",
    description: "Evidence first. Decisions with a source trail.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}

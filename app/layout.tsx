import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, DM_Sans, Noto_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Obsidian fonts
const cormorant = Cormorant_Garamond({
  variable: "--font-obsidian-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});
const dmSans = DM_Sans({
  variable: "--font-obsidian-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-obsidian-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-obsidian-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: {
    default: "Jewelry Prompt Studio",
    template: "%s | Jewelry Prompt Studio",
  },
  description: "AI-powered prompt engineering for luxury jewelry marketing. Generate production-ready prompts for Midjourney, DALL-E 3, Runway, and Kling.",
  openGraph: {
    title: "Jewelry Prompt Studio",
    description: "Transform your jewelry marketing with AI. Analyze references, develop concepts, and generate production-ready prompts.",
    type: "website",
    siteName: "Jewelry Prompt Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewelry Prompt Studio",
    description: "AI-powered prompt engineering for luxury jewelry marketing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${dmSans.variable} ${notoArabic.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col mesh-bg">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if Clerk is configured (otherwise Clerk throws)
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <ClerkProvider>{content}</ClerkProvider>
    : content;
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col mesh-bg">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/lib/analytics/provider";
import { PageViewTracker } from "@/lib/analytics/page-view-tracker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "AI-Native Boilerplate",
    template: "%s | AI-Native Boilerplate",
  },
  description: "Production-ready AI-native development template",
  keywords: ["Next.js", "React", "TypeScript", "AI-Native"],
  authors: [{ name: "Your Team" }],
  creator: "Your Team",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AI-Native Boilerplate",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <PostHogProvider>
          <PageViewTracker />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccessibilityProvider } from "@/components/settings/AccessibilityProvider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlatformI - Multimodal Regional Transit Network",
  description:
    "Unified regional transit intelligence for Jakarta, Greater Jabodetabek, and Intercity networks.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" dir="ltr" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-[#090d16] bg-noise-grain text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}

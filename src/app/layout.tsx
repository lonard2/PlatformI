import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlatformI - Multimodal Regional Transit Cockpit",
  description:
    "Unified regional transit intelligence cockpit for Jakarta, Greater Jabodetabek, and Intercity networks.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

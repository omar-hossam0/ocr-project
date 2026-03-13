import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import ToastProvider from "@/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocuMind AI - Smart Document Archiving",
  description:
    "Upload documents, get instant insights with OCR-powered smart archiving",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050816]`}
      >
        {/* Fixed stars background — sits behind everything */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <StarsBackground
            starColor="#FFF"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#1b2a4a_0%,_#050816_100%)]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10">
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}

import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "ELONODE",
  description:
    "A high-performance percentile tracking system built with Go and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#10b981",
          colorBackground: "",
          colorText: "#ffffff",
          colorTextSecondary: "#d4d4d8",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          logoBox: {
            display: "none",
          },

          card: {
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
          },

          headerTitle: {
            color: "#ffffff",
            fontFamily: "var(--font-orbitron)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          },

          headerSubtitle: {
            color: "#d4d4d8",
          },

          identityPreviewText: {
            color: "#e4e4e7",
            fontWeight: "500",
          },

          socialButtonsBlockButton: {
            backgroundColor: "#27272a",
            border: "1px solid #3f3f46",
          },

          socialButtonsBlockButtonText: {
            color: "#ffffff",
            fontWeight: "600",
          },

          socialButtonsProviderIcon: {
            filter: "brightness(0) invert(1)",
          },

          "socialButtonsProviderIcon--github": {
            filter: "brightness(0) invert(1) contrast(1.2)",
            opacity: "1",
          },

          formFieldInput: {
            backgroundColor: "#ffffff",
            borderColor: "#3f3f46",
            color: "#27272a",
          },

          otpCodeFieldInput: {
            backgroundColor: "#ffffff",
            borderColor: "#3f3f46",
            color: "#27272a",
            fontWeight: "600",
          },

          formFieldLabel: {
            color: "#e4e4e7",
          },

          formFieldHintText: {
            color: "#a1a1aa",
          },

          formFieldInfoText: {
            color: "#a1a1aa",
          },

          formFieldErrorText: {
            color: "#ef4444",
          },

          formFieldSuccessText: {
            color: "#10b981",
            fontWeight: "500",
          },

          formFieldInput__verificationCode: {
            backgroundColor: "#ffffff",
            borderColor: "#3f3f46",
            color: "#27272a",
            fontWeight: "600",
          },

          dividerLine: {
            backgroundColor: "#3f3f46",
          },

          dividerText: {
            color: "#a1a1aa",
          },

          footerActionText: {
            color: "#a1a1aa",
          },

          footerActionLink: {
            color: "#10b981",
            fontWeight: "600",
          },

          formButtonPrimary: {
            backgroundColor: "#10b981",
            color: "#ffffff",
            fontWeight: "600",
          },
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased flex min-h-screen bg-zinc-950 text-zinc-50 overflow-hidden`}
        >
          <Sidebar />
          <main className="flex-1 overflow-y-auto h-screen relative">
            {children}
          </main>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}

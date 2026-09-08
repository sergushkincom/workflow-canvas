import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import { TokenStyles } from "@/components/experiments/workflow-canvas/token-styles";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic UX Lab",
  description:
    "Interaction problems in AI and enterprise software, built rather than described.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-page font-sans text-ink">
        <Script
          src="https://mcp.figma.com/mcp/html-to-design/capture.js"
          strategy="beforeInteractive"
        />
        <TokenStyles />
        {children}
      </body>
    </html>
  );
}

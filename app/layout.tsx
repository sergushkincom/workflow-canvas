import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { TokenStyles } from "@/components/experiments/workflow-canvas/token-styles";
import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workflow canvas",
  description:
    "What an interface looks like when a system is honest about not knowing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col bg-page font-sans text-ink">
        <TokenStyles />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

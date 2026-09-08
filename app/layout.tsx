import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { TokenStyles } from "@/components/experiments/workflow-canvas/token-styles";

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
      <body className="min-h-full bg-page font-sans text-ink">
        <TokenStyles />
        {children}
      </body>
    </html>
  );
}

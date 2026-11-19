import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "AI Codebase Archaeologist",
  description: "Evidence-first repository intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <Header />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}

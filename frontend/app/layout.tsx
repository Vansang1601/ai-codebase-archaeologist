import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import { I18nProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "AI Codebase Archaeologist",
  description: "Evidence-first repository intelligence",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <Header />
          <main className="shell">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}

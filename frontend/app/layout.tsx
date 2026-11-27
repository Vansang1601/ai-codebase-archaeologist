import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import "./excavation.css";
import "./polish.css";
import Header from "./components/Header";
import { ChatProvider } from "./components/ChatProvider";
import { I18nProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "AI Codebase Archaeologist",
  description: "Evidence-first repository intelligence",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <I18nProvider>
          <ChatProvider>
            <Header />
            <main id="main-content" tabIndex={-1}>{children}</main>
          </ChatProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

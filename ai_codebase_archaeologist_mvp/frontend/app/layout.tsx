import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Codebase Archaeologist",
  description: "Evidence-first repository intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="topbar">
          <a href="/" className="brand">AI Codebase Archaeologist</a>
          <span className="badge">evidence-first MVP</span>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}

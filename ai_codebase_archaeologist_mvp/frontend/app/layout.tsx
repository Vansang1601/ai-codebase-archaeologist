import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Codebase Archaeologist",
  description: "Evidence-first repository intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="row" style={{ gap: "12px" }}>
            <a href="/" className="brand">AI Codebase Archaeologist</a>
            <span className="badge">evidence-first MVP</span>
          </div>
          <nav className="row" style={{ gap: "16px", fontSize: "13px" }}>
            <a href="/en/repositories" className="muted">Repositories</a>
            <a href="/en/login" className="muted">Login</a>
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}

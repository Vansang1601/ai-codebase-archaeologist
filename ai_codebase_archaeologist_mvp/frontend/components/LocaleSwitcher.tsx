"use client";

import { usePathname, useRouter } from "next/navigation";
import { Locale } from "../lib/translations";

export default function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === currentLocale) return;
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Replace the locale prefix in current pathname
    let newPath = pathname;
    if (pathname.startsWith(`/${currentLocale}`)) {
      newPath = pathname.replace(`/${currentLocale}`, `/${nextLocale}`);
    } else {
      newPath = `/${nextLocale}${pathname}`;
    }
    router.push(newPath);
  }

  return (
    <div className="locale-switcher" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        style={{
          background: currentLocale === "en" ? "#2457a6" : "transparent",
          color: currentLocale === "en" ? "#fff" : "var(--muted)",
          border: "1px solid var(--border)",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: currentLocale === "en" ? "bold" : "normal",
          cursor: "pointer",
        }}
      >
        EN
      </button>
      <span style={{ color: "var(--border)", fontSize: "12px" }}>|</span>
      <button
        type="button"
        onClick={() => switchLocale("vi")}
        style={{
          background: currentLocale === "vi" ? "#2457a6" : "transparent",
          color: currentLocale === "vi" ? "#fff" : "var(--muted)",
          border: "1px solid var(--border)",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: currentLocale === "vi" ? "bold" : "normal",
          cursor: "pointer",
        }}
      >
        VI
      </button>
    </div>
  );
}

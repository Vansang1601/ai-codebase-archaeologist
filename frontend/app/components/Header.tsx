"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { BrandMark } from "./WorkspaceUI";

type Profile = { username: string; demo?: boolean };
type Auth = "loading" | "enabled" | "demo" | "offline";

export default function Header() {
  const { locale, setLocale, t } = useI18n();
  const [user, setUser] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<Auth>("loading");

  useEffect(() => {
    let current = true;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || url.searchParams.get("access_token");
    const username = url.searchParams.get("username");

    if (token) {
      setToken(token);
      url.searchParams.delete("token");
      url.searchParams.delete("access_token");
    }

    if (username) {
      for (const key of ["username", "avatar", "name"]) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
    }

    // Check existing session with backend via cookie
    api.me().then(
      u => {
        if (current && u?.email) {
          const profile = { username: u.name || u.email.split("@")[0], demo: u.email.includes("developer") };
          setUser(profile);
        }
      },
      () => {
        if (current) setUser(null);
      }
    );

    api.authStatus().then(
      data => {
        if (current) {
          if (data.github_oauth_configured || data.enabled) {
            setAuth("enabled");
          } else if (data.allow_dev_login !== false) {
            setAuth("demo");
          } else {
            setAuth("offline");
          }
        }
      },
      () => { if (current) setAuth("offline"); }
    );
    return () => { current = false; };
  }, []);

  function handleLogout() {
    setUser(null);
    setToken(null);
    api.logout().catch(() => {});
  }

  return (
    <header className="mast">
      <div className="mast-inner">
        <Link href="/" className="brand">
          <BrandMark />
          {t.brand}
        </Link>
        <nav className="mast-nav" aria-label="Main Navigation">
          <Link href="/#analyze">{t.navAnalyze}</Link>
          <Link href="/#library">{t.navLibrary}</Link>
        </nav>
        <div className="account" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* EN | VI Language Switcher */}
          <div
            className="locale-switcher"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "6px",
              background: "var(--soft)",
              border: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            <button
              type="button"
              onClick={() => setLocale("en")}
              style={{
                background: locale === "en" ? "var(--blue)" : "transparent",
                color: locale === "en" ? "#fff" : "var(--muted)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: 0,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              EN
            </button>
            <span style={{ color: "var(--line)" }}>|</span>
            <button
              type="button"
              onClick={() => setLocale("vi")}
              style={{
                background: locale === "vi" ? "var(--blue)" : "transparent",
                color: locale === "vi" ? "#fff" : "var(--muted)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: 0,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              VI
            </button>
          </div>

          {user ? (
            <>
              <span className="profile" title={user.username}>
                {user.demo ? t.demoTag : "@" + user.username}
              </span>
              <button className="quiet" onClick={handleLogout}>
                {t.navSignOut}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="quiet"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "var(--soft)",
                border: "1px solid var(--line)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              {t.navSignIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

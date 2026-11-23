"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { BrandMark } from "./WorkspaceUI";
import Icon from "./Icon";

export default function Header() {
  const { locale, setLocale, t } = useI18n();
  const path = usePathname();
  const [profile, setProfile] = useState("");
  const [dark, setDark] = useState(false);
  const [active, setActive] = useState("analyze");

  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  useEffect(() => {
    let current = true;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token") || url.searchParams.get("access_token");
    if (token) setToken(token);
    if (token || url.searchParams.has("username")) {
      for (const key of ["token", "access_token", "username", "avatar", "name"]) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
    }
    api.me().then(user => {
      if (current) setProfile(user?.name || user?.email?.split("@")[0] || "");
    }, () => { if (current) setProfile(""); });
    return () => { current = false; };
  }, [path]);
  useEffect(() => {
    if (path !== "/") return;
    const sections = ["analyze", "library", "about"].map(id => document.getElementById(id));
    function onScroll() {
      // Several sections can fit together at the end of a short page.
      // Keep the requested anchor active while its heading is visible.
      const anchored = sections.find(el => el && "#" + el.id === window.location.hash);
      const top = anchored?.getBoundingClientRect().top;
      if (anchored && top !== undefined && top >= 0 && top < window.innerHeight) {
        setActive(anchored.id);
        return;
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        setActive("about");
        return;
      }
      const current = sections.filter(el => el && el.getBoundingClientRect().top <= 140).pop();
      setActive(current?.id || "analyze");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
  }, [path]);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  const SectionLink = path === "/" ? "a" : Link;
  return (
    <header className="mast"><a className="sr-only skip" href="#main-content">{locale === "vi" ? "Đến nội dung chính" : "Skip to content"}</a><div className="wrap mast-inner">
      <Link href="/" className="brand"><BrandMark />{t.brand}</Link>
      <nav className="mast-nav" aria-label={locale === "vi" ? "Điều hướng chính" : "Main navigation"}>
        {([["analyze", t.navAnalyze], ["library", t.navLibrary], ["about", t.navAbout]] as const).map(([id, label]) => (
          <SectionLink key={id} href={"/#" + id} aria-current={(path === "/" && active === id) || (path.startsWith("/repos/") && id === "library") ? "location" : undefined}>{label}</SectionLink>
        ))}
      </nav>
      <div className="account">
        <button type="button" className="icon-button" onClick={toggleTheme} title={t.themeToggle} aria-label={t.themeToggle}><Icon name={dark ? "sun" : "moon"} size={17}/></button>
        <button type="button" className="language" onClick={() => setLocale(locale === "vi" ? "en" : "vi")} title={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"} aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}><Icon name="globe" size={15}/>{locale.toUpperCase()}</button>
        {profile ? <button className="account-link" title={profile} onClick={async () => { try { await api.logout(); } finally { setToken(null); window.location.assign("/"); } }}>{t.navSignOut}</button>
          : <Link className="account-link" href="/login">{t.navSignIn}<Icon name="upRight" size={14}/></Link>}
      </div>
    </div></header>
  );
}

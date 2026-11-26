"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getToken, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { BrandMark } from "./WorkspaceUI";
import Icon from "./Icon";
import { FlagEN, FlagVN } from "./Flag";

export default function Header() {
  const { locale, setLocale, t } = useI18n();
  const path = usePathname();
  const [profile, setProfile] = useState("");
  const [avatar, setAvatar] = useState("");
  const [dark, setDark] = useState(false);

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
    if (!getToken()) {
      setProfile("");
      setAvatar("");
      return;
    }
    api.me().then(user => {
      if (current) {
        setProfile(user?.name || user?.email?.split("@")[0] || "");
        setAvatar(user?.avatar_url || "");
      }
    }, () => {
      if (current) {
        setProfile("");
        setAvatar("");
      }
    });
    return () => { current = false; };
  }, [path]);
  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  const links = [
    ["/", t.navHome],
    ["/guide", t.navGuide],
    ...(profile ? [["/library", t.navLibrary]] : []),
  ];
  return (
    <header className="mast"><a className="sr-only skip" href="#main-content">{locale === "vi" ? "Đến nội dung chính" : "Skip to content"}</a><div className="wrap mast-inner">
      <Link href="/" className="brand"><BrandMark />{t.brand}</Link>
      <nav className="mast-nav" aria-label={locale === "vi" ? "Điều hướng chính" : "Main navigation"}>
        {links.map(([href, label]) => (
          <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <div className="account">
        <button type="button" className="icon-button" onClick={toggleTheme} title={t.themeToggle} aria-label={t.themeToggle}><Icon name={dark ? "sun" : "moon"} size={17}/></button>
        <div className="lang-switch" role="group" aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"}>
          <button type="button" className="lang-flag" aria-pressed={locale === "vi"} onClick={() => setLocale("vi")} title="Tiếng Việt" aria-label="Tiếng Việt"><FlagVN/></button>
          <button type="button" className="lang-flag" aria-pressed={locale === "en"} onClick={() => setLocale("en")} title="English" aria-label="English"><FlagEN/></button>
        </div>
        {profile ? (
          <>
            <Link href="/profile" className={`account-link account-user ${path === "/profile" ? "active" : ""}`} title={profile} aria-label={`${t.navProfile}: ${profile}`}>
              {avatar ? (
                <Image src={avatar} width={18} height={18} alt="" className="avatar-img-sm" unoptimized />
              ) : (
                <Icon name="user" size={14}/>
              )}
              <span className="account-name">{profile}</span>
            </Link>
            <button className="account-link account-logout" title={t.navSignOut} onClick={async () => { try { await api.logout(); } finally { setToken(null); window.location.assign("/"); } }}>
              <Icon name="logout" size={14}/>
              <span className="logout-text">{t.navSignOut}</span>
            </button>
          </>
        ) : (
          <Link className="account-link" href="/login">{t.navSignIn}<Icon name="upRight" size={14}/></Link>
        )}
      </div>
    </div></header>
  );
}

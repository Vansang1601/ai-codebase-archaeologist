"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { BrandMark } from "./WorkspaceUI";

type Profile = { username: string; demo?: boolean };
type Auth = "loading" | "enabled" | "demo" | "offline";

export default function Header() {
  const [user, setUser] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<Auth>("loading");

  useEffect(() => {
    const url = new URL(window.location.href);
    const username = url.searchParams.get("username");
    try {
      if (username) {
        const profile = { username };
        setUser(profile);
        localStorage.setItem("gh_user", JSON.stringify(profile));
      } else {
        const saved = JSON.parse(localStorage.getItem("gh_user") || "null");
        if (typeof saved?.username === "string") {
          setUser({ username: saved.username, demo: saved.demo === true || saved.name === "Demo Developer" });
        }
      }
    } catch { /* The profile is optional in browsers with restricted storage. */ }
    if (username) {
      for (const key of ["username", "avatar", "name"]) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
    }
    let current = true;
    api.authStatus().then(
      data => { if (current) setAuth(data.enabled ? "enabled" : "demo"); },
      () => { if (current) setAuth("offline"); }
    );
    return () => { current = false; };
  }, []);

  function update(profile: Profile | null) {
    setUser(profile);
    try {
      if (profile) localStorage.setItem("gh_user", JSON.stringify(profile));
      else localStorage.removeItem("gh_user");
    } catch { /* A session can still display its current profile. */ }
  }

  return <header className="mast">
    <div className="mast-inner">
      <Link href="/" className="brand"><BrandMark />Archaeologist</Link>
      <nav className="mast-nav" aria-label="Điều hướng chính">
        <Link href="/#analyze">Phân tích</Link><Link href="/#library">Kho mã</Link>
      </nav>
      <div className="account">
        {user ? <>
          <span className="profile" title={user.username}>{user.demo ? "Demo" : "@" + user.username}</span>
          <button className="quiet" onClick={() => update(null)}>Đăng xuất</button>
        </> : auth === "enabled" ? <a className="quiet" href={api.authLoginUrl}>Đăng nhập GitHub</a>
          : auth === "demo" ? <button className="quiet" onClick={() => update({ username: "developer", demo: true })}>Thử hồ sơ demo</button>
            : <span className="muted">{auth === "loading" ? "Đang kết nối…" : "Chế độ khách"}</span>}
      </div>
    </div>
  </header>;
}

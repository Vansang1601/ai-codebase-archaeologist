"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { messageOf, ReadView, useRead } from "../components/WorkspaceUI";
import Icon from "../components/Icon";
import StrataFigure from "../components/StrataFigure";

export default function LoginPage() {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();
  const auth = useRead(useCallback(api.authStatus, []));
  const [email, setEmail] = useState("developer@example.com");
  const [name, setName] = useState("Developer");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    if (new URLSearchParams(location.search).has("error")) setError("OAuth");
    api.me().then(user => { if (current && user?.email) router.replace("/"); }, () => {});
    return () => { current = false; };
  }, [router]);

  async function oauth(provider: "github" | "google") {
    if (busy) return;
    setError(""); setBusy(provider);
    try {
      const { url } = await api.oauthUrl(provider);
      window.location.assign(url);
    } catch (err) { setError(messageOf(err, locale)); setBusy(""); }
  }

  async function devAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    const action = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value || "login";
    setBusy(action); setError("");
    try {
      const session = action === "register" ? await api.register(email.trim(), name.trim()) : await api.login(email.trim());
      if (!session.access_token) throw new Error(vi ? "Chưa nhận được phiên đăng nhập." : "No session was returned.");
      setToken(session.access_token);
      router.replace("/");
    } catch (err) { setError(messageOf(err, locale)); setBusy(""); }
  }

  return <div className="wrap login-page">
    <Link className="crumb" href="/"><Icon name="back" size={15}/>{vi ? "Trang chủ" : "Home"}</Link>
    <div className="login-layout">
      <aside className="login-art" aria-hidden="true"><StrataFigure/></aside>
      <section className="login-panel">
        <h1>{t.loginTitle}</h1><p className="muted">{t.loginSubtitle}</p>
        {error && <p className="notice error" role="alert">{error === "OAuth" ? (vi ? "Đăng nhập chưa hoàn tất. Vui lòng thử lại." : "Sign-in did not finish. Please try again.") : error}</p>}
        <ReadView read={auth}>{status => <>
          <div className="provider-list">
            {(["github", "google"] as const).map(provider => {
              const configured = provider === "github" ? status.github_oauth_configured : status.google_oauth_configured;
              return <button key={provider} type="button" className="provider" disabled={!!busy || configured === false} onClick={() => oauth(provider)}>
                {provider === "github" ? <Icon name="github" size={19}/> : <span className="google-mark" aria-hidden="true">G</span>}
                {provider === "github" ? t.continueGitHub : t.continueGoogle}
                {busy === provider && <span className="spinner"/>}
                {configured === false && <small>{vi ? "Chưa cấu hình" : "Unavailable"}</small>}
              </button>;
            })}
          </div>
          {status.allow_dev_login && <form className="dev-form" onSubmit={devAuth}>
            <h2>{t.devLoginTitle}</h2><p className="muted">{t.devLoginDesc}</p>
            <label htmlFor="dev-email">{t.emailLabel}</label>
            <input id="dev-email" type="email" value={email} autoComplete="email" onChange={e => setEmail(e.target.value)} required/>
            <label htmlFor="dev-name">{t.nameLabel}</label>
            <input id="dev-name" value={name} autoComplete="name" onChange={e => setName(e.target.value)}/>
            <div className="form-actions"><button className="primary" value="login" disabled={!!busy}>{t.btnSignIn}{busy === "login" && <span className="spinner"/>}</button>
              <button className="quiet" value="register" disabled={!!busy}>{t.btnCreateWorkspace}{busy === "register" && <span className="spinner"/>}</button></div>
          </form>}
          {!status.allow_dev_login && !status.github_oauth_configured && !status.google_oauth_configured && <p className="notice caution">{vi ? "Liên hệ quản trị viên để bật phương thức đăng nhập cho không gian này." : "Contact the workspace administrator to enable a sign-in method."}</p>}
        </>}</ReadView>
      </section>
    </div>
  </div>;
}

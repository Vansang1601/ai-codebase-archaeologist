"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { messageOf, ReadView, useRead } from "../components/WorkspaceUI";
import Icon from "../components/Icon";
import StrataFigure from "../components/StrataFigure";

function formatOAuthError(code: string, vi: boolean, origin: string): string {
  const cb = `${origin}/api/auth/oauth/google/callback`;
  if (code === "access_denied") {
    return vi
      ? "Google từ chối truy cập (App đang ở chế độ Testing — hãy thêm email vào Test users hoặc Publish App trong Google Cloud Console)."
      : "Google denied access (App is in Testing mode — add your email to Test users or Publish App in Google Cloud Console).";
  }
  if (code.includes("redirect_uri_mismatch") || code === "google_token_failed" || code === "google_invalid_grant") {
    return vi
      ? `Lỗi Google OAuth (${code}). Hãy kiểm tra Authorized redirect URIs trong Google Cloud Console phải có: ${cb}`
      : `Google OAuth error (${code}). Ensure Authorized redirect URIs in Google Cloud Console includes: ${cb}`;
  }
  if (code === "invalid_magic_link") {
    return vi
      ? "Link đăng nhập không hợp lệ hoặc đã hết hạn (15 phút). Vui lòng tạo link mới."
      : "Login link is invalid or expired (15 minutes). Please generate a new one.";
  }
  return vi
    ? `Đăng nhập chưa hoàn tất (${code}). Vui lòng thử lại.`
    : `Sign-in did not finish (${code}). Please try again.`;
}

export default function LoginPage() {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();
  const auth = useRead(api.authStatus);
  const [email, setEmail] = useState("developer@example.com");
  const [name, setName] = useState("Developer");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [magicUrl, setMagicUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let current = true;
    function resumeSession() {
      const token = new URLSearchParams(location.hash.slice(1)).get("session_token");
      if (token) {
        setToken(token);
        window.history.replaceState(window.history.state, "", location.pathname + location.search);
      }
      const errParam = new URLSearchParams(location.search).get("error");
      if (errParam) setError(formatOAuthError(errParam, vi, window.location.origin));
      api.me().then(user => { if (current && user?.email) router.replace("/library"); }, () => {});
    }
    resumeSession();
    window.addEventListener("hashchange", resumeSession);
    return () => {
      current = false;
      window.removeEventListener("hashchange", resumeSession);
    };
  }, [router, vi]);

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
    setBusy(action); setError(""); setMagicUrl(""); setCopied(false);
    try {
      if (action === "magic") {
        const res = await api.createMagicLink(email.trim(), name.trim());
        setMagicUrl(res.login_url);
        setBusy("");
        return;
      }
      const session = action === "register" ? await api.register(email.trim(), name.trim()) : await api.login(email.trim());
      if (!session.access_token) throw new Error(vi ? "Chưa nhận được phiên đăng nhập." : "No session was returned.");
      setToken(session.access_token);
      router.replace("/library");
    } catch (err) { setError(messageOf(err, locale)); setBusy(""); }
  }

  async function copyMagicUrl() {
    if (!magicUrl) return;
    try {
      await navigator.clipboard.writeText(magicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return <div className="wrap login-page">
    <Link className="crumb" href="/"><Icon name="back" size={15}/>{vi ? "Trang chủ" : "Home"}</Link>
    <div className="login-layout">
      <aside className="login-art" aria-hidden="true"><StrataFigure/></aside>
      <section className="login-panel">
        <h1>{t.loginTitle}</h1><p className="muted">{t.loginSubtitle}</p>
        {error && <p className="notice error" role="alert">{error}</p>}
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
            <div className="form-actions">
              <button className="primary" value="login" disabled={!!busy}>{t.btnSignIn}{busy === "login" && <span className="spinner"/>}</button>
              <button className="quiet" value="register" disabled={!!busy}>{t.btnCreateWorkspace}{busy === "register" && <span className="spinner"/>}</button>
              <button className="quiet" value="magic" disabled={!!busy}>{vi ? "Tạo link đăng nhập" : "Create login link"}{busy === "magic" && <span className="spinner"/>}</button>
            </div>
            {magicUrl && <div className="notice" style={{ marginTop: "12px", wordBreak: "break-all" }}>
              <p style={{ margin: "0 0 8px 0" }}><strong>{vi ? "Link đăng nhập (hiệu lực 15 phút):" : "Login link (valid 15 min):"}</strong></p>
              <code style={{ display: "block", fontSize: "12px", marginBottom: "10px" }}>{magicUrl}</code>
              <div className="form-actions">
                <a className="primary" href={magicUrl} style={{ textDecoration: "none" }}>{vi ? "Đăng nhập bằng link này" : "Sign in with this link"}</a>
                <button type="button" className="quiet" onClick={copyMagicUrl}>{copied ? (vi ? "Đã copy!" : "Copied!") : (vi ? "Copy link" : "Copy link")}</button>
              </div>
            </div>}
          </form>}
          {!status.allow_dev_login && !status.github_oauth_configured && !status.google_oauth_configured && <p className="notice caution">{vi ? "Liên hệ quản trị viên để bật phương thức đăng nhập cho không gian này." : "Contact the workspace administrator to enable a sign-in method."}</p>}
        </>}</ReadView>
      </section>
    </div>
  </div>;
}

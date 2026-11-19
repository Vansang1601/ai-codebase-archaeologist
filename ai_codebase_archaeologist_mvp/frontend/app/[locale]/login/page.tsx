"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, translations } from "../../../lib/translations";
import LocaleSwitcher from "../../../components/LocaleSwitcher";
import { api, setToken } from "../../../lib/api";

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === "vi" ? "vi" : "en";
  const t = translations[locale];
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDevAuth, setShowDevAuth] = useState(false);

  useEffect(() => {
    api.authStatus()
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ auth_configured: false, github_oauth_configured: false }));
  }, []);

  const isOAuthMissing = !authStatus?.github_oauth_configured;

  function handleOAuthClick(provider: "github" | "google") {
    if (isOAuthMissing) {
      setError(
        locale === "vi"
          ? `CẦN CẤU HÌNH HỆ THỐNG: OAuth ${provider} chưa được cấu hình (thiếu AUTH_${provider.toUpperCase()}_ID / SECRET trong .env). Không thể đăng nhập giả lập.`
          : `CONFIGURATION REQUIRED: ${provider} OAuth is not configured (missing AUTH_${provider.toUpperCase()}_ID / SECRET in .env). Cannot fake login.`
      );
      return;
    }
    // Real OAuth redirect would happen here when configured
    window.location.href = `/api/auth/signin/${provider}`;
  }

  async function handleDevSignIn(isRegister: boolean) {
    if (!email.trim()) {
      setError(locale === "vi" ? "Vui lòng nhập email" : "Please enter your email");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let res;
      if (isRegister) {
        res = await api.register(email.trim(), name.trim() || undefined);
      } else {
        res = await api.login(email.trim());
      }
      setToken(res.access_token);
      router.push(`/${locale}/repositories`);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "75vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="card stack"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(16, 28, 47, 0.95)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header with Title and Language Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
              {t.brand}
            </h1>
            <p className="muted" style={{ fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
              {t.tagline}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <LocaleSwitcher currentLocale={locale} />
        </div>

        {/* OAuth Warning Banner when credentials are not configured */}
        {isOAuthMissing && (
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(249, 199, 79, 0.12)",
              border: "1px solid #f9c74f",
              borderRadius: "10px",
              fontSize: "12px",
              lineHeight: 1.5,
              color: "#f9c74f",
            }}
          >
            <strong>⚠️ {t.configRequired}</strong>
            <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "11px" }}>
              {t.oauthNotice}
            </p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {/* OAuth Buttons */}
        <div className="stack" style={{ gap: "10px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => handleOAuthClick("github")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              padding: "12px",
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "10px",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {t.continueGitHub}
          </button>

          <button
            type="button"
            onClick={() => handleOAuthClick("google")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              padding: "12px",
              background: "#ffffff",
              border: "1px solid #dadce0",
              borderRadius: "10px",
              color: "#3c4043",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.19 0 9.99 0 12s.45 3.81 1.25 5.4l4.03-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            {t.continueGoogle}
          </button>
        </div>

        {/* Development Workspace Login Toggle */}
        <div style={{ marginTop: "18px", textAlign: "center" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowDevAuth(!showDevAuth)}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            {showDevAuth ? "▲ Hide Development Login" : "▼ Development / Testing Login"}
          </button>
        </div>

        {showDevAuth && (
          <div
            className="stack"
            style={{
              marginTop: "12px",
              padding: "16px",
              background: "#0a1525",
              border: "1px solid var(--border)",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)" }}>
              {t.devLoginTitle}
            </div>
            <p className="muted" style={{ fontSize: "11px", margin: 0 }}>
              {t.devLoginDesc}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              style={{ fontSize: "13px" }}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Developer Name (optional)"
              style={{ fontSize: "13px" }}
            />
            <div className="row" style={{ marginTop: "4px" }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDevSignIn(false)}
                style={{ flex: 1, fontSize: "13px" }}
              >
                {t.signInBtn}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => handleDevSignIn(true)}
                style={{ flex: 1, fontSize: "13px" }}
              >
                {t.registerBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

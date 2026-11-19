"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<any>(null);
  const [email, setEmail] = useState("developer@example.com");
  const [name, setName] = useState("Developer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated
    api.me()
      .then((user) => {
        if (user?.email) {
          router.push("/");
        }
      })
      .catch(() => {});

    api.authStatus()
      .then(setAuthStatus)
      .catch(() => {});
  }, [router]);

  async function handleOAuthLogin(provider: "github" | "google") {
    setError("");
    setOauthNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`http://localhost:8000/api/auth/oauth/${provider}/url`);
      const data = await res.json();
      if (!res.ok) {
        setOauthNotice(data.detail || t.configRequiredNotice);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setOauthNotice(err.message || t.configRequiredNotice);
    } finally {
      setBusy(false);
    }
  }

  async function handleDevAuth(isRegister: boolean) {
    if (!email.trim() || busy) return;
    setError("");
    setBusy(true);
    try {
      const res = isRegister
        ? await api.register(email.trim(), name.trim())
        : await api.login(email.trim());

      if (res?.access_token) {
        setToken(res.access_token);
        router.push("/");
      } else {
        throw new Error("No access token returned");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: "540px", margin: "40px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" className="crumb">
          {t.btnBackHome}
        </Link>
      </div>

      <div
        className="panel"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 4px 20px rgba(23, 32, 45, 0.05)",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px 0", color: "var(--ink)" }}>
          {t.loginTitle}
        </h1>
        <p className="muted" style={{ margin: "0 0 24px 0", fontSize: "14px" }}>
          {t.loginSubtitle}
        </p>

        {error && (
          <div className="notice error" role="alert" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {oauthNotice && (
          <div
            className="notice caution"
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              fontSize: "13px",
            }}
          >
            <strong>{t.configRequiredTitle}: </strong>
            {oauthNotice}
          </div>
        )}

        {/* OAuth Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuthLogin("github")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "#24292f",
              color: "#fff",
              borderRadius: "10px",
              padding: "12px",
              fontWeight: 600,
            }}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t.continueGitHub}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleOAuthLogin("google")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: "#ffffff",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "10px",
              padding: "12px",
              fontWeight: 600,
            }}
          >
            <svg height="20" width="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {t.continueGoogle}
          </button>
        </div>

        {/* Development / Testing Section (Hidden in Production) */}
        {authStatus?.allow_dev_login && (
          <div
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: "20px",
              marginTop: "20px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--ink)", marginBottom: "4px" }}>
              {t.devLoginTitle}
            </div>
            <p className="muted" style={{ fontSize: "12px", margin: "0 0 14px 0" }}>
              {t.devLoginDesc}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", marginBottom: "4px" }}>{t.emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", marginBottom: "4px" }}>{t.nameLabel}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Developer Name"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDevAuth(false)}
                  style={{ flex: 1 }}
                >
                  {t.btnSignIn}
                </button>
                <button
                  type="button"
                  className="quiet"
                  disabled={busy}
                  onClick={() => handleDevAuth(true)}
                  style={{
                    flex: 1,
                    background: "var(--soft)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {t.btnCreateWorkspace}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

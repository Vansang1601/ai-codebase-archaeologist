"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, setToken, type UserProfile } from "../../lib/api";
import { useI18n, type Locale } from "../../lib/i18n";
import Icon from "../components/Icon";

export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [userLocale, setUserLocale] = useState("vi");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busyOAuth, setBusyOAuth] = useState("");

  useEffect(() => {
    let current = true;
    api.me().then(
      profile => {
        if (!current) return;
        setUser(profile);
        setName(profile.name || "");
        setUserLocale(profile.preferred_locale || locale);
        setLoading(false);
      },
      () => {
        if (!current) return;
        setToken(null);
        router.replace("/login");
      }
    );
    return () => {
      current = false;
    };
  }, [router, locale]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await api.updateProfile({
        name: name.trim(),
        preferred_locale: userLocale,
      });
      if (userLocale !== locale) {
        setLocale(userLocale as Locale);
      }
      setUser(prev => (prev ? { ...prev, name: res.name || name.trim(), preferred_locale: res.preferred_locale } : null));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || (vi ? "Không thể lưu thông tin." : "Could not save profile."));
    } finally {
      setSaving(false);
    }
  }

  function copyTenantId() {
    if (!user?.tenant_id) return;
    navigator.clipboard.writeText(user.tenant_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function connectOAuth(provider: "github" | "google") {
    if (busyOAuth) return;
    setBusyOAuth(provider);
    try {
      const { url } = await api.oauthUrl(provider);
      window.location.assign(url);
    } catch {
      setBusyOAuth("");
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setToken(null);
      window.location.assign("/");
    }
  }

  if (loading) {
    return (
      <div className="wrap profile-page">
        <div className="profile-loading">
          <span className="spinner" />
          <p className="muted">{vi ? "Đang tải thông tin hồ sơ…" : "Loading profile…"}</p>
        </div>
      </div>
    );
  }

  const hasGithub = user?.accounts?.some(a => a.provider === "github");
  const hasGoogle = user?.accounts?.some(a => a.provider === "google");
  const roleName = user?.role === "owner" ? (vi ? "Chủ sở hữu" : "Owner") : (vi ? "Thành viên" : "Member");
  const initials = (name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="wrap profile-page">
      <div className="profile-top-nav">
        <Link className="crumb" href="/">
          <Icon name="back" size={15} />
          {t.btnBackHome}
        </Link>
      </div>

      {/* Hero Profile Banner */}
      <section className="profile-hero panel">
        <div className="profile-hero-content">
          <div className="profile-avatar-wrap">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">{initials}</div>
            )}
          </div>
          <div className="profile-hero-meta">
            <div className="profile-hero-title-row">
              <h1>{name || user?.name || user?.email?.split("@")[0]}</h1>
              <span className={`role-badge ${user?.role === "owner" ? "owner" : "member"}`}>
                <Icon name="shield" size={12} />
                {roleName}
              </span>
            </div>
            <p className="profile-email muted">{user?.email}</p>
            {user?.created_at && (
              <p className="profile-joined muted">
                <Icon name="clock" size={13} />
                {t.profileJoinedLabel}: {new Date(user.created_at).toLocaleDateString(vi ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="profile-grid">
        {/* Card 1: Personal Information */}
        <section className="panel profile-card">
          <div className="profile-card-header">
            <h2>{t.profileSectionPersonal}</h2>
            <p className="muted">{vi ? "Cập nhật tên hiển thị và ngôn ngữ giao diện của bạn." : "Update your display name and interface language."}</p>
          </div>

          <form onSubmit={handleSave} className="profile-form">
            {saved && (
              <div className="notice success" role="status">
                <Icon name="check" size={15} />
                {t.profileSavedNotice}
              </div>
            )}
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="user-name">{t.profileNameLabel}</label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={vi ? "Nhập họ tên của bạn" : "Enter your full name"}
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-email">{t.profileEmailLabel}</label>
              <div className="input-with-badge">
                <input id="user-email" type="email" value={user?.email || ""} readOnly disabled className="input-readonly" />
                <span className="badge-verified">
                  <Icon name="check" size={12} />
                  {vi ? "Đã xác thực" : "Verified"}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="user-locale">{t.profileLocaleLabel}</label>
              <select
                id="user-locale"
                value={userLocale}
                onChange={e => setUserLocale(e.target.value)}
                className="form-select"
              >
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>

            <button type="submit" className="primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner" />
                  {t.profileSavingBtn}
                </>
              ) : (
                t.profileSaveBtn
              )}
            </button>
          </form>
        </section>

        {/* Card 2: Workspace & Organization */}
        <section className="panel profile-card">
          <div className="profile-card-header">
            <h2>{t.profileSectionWorkspace}</h2>
            <p className="muted">{vi ? "Thông tin không gian làm việc và quyền hạn hiện tại." : "Information about your workspace and current permissions."}</p>
          </div>

          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="info-label">{t.profileWorkspaceNameLabel}</span>
              <span className="info-value font-semibold">{user?.workspace_name || "Personal Workspace"}</span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">{t.profileRoleLabel}</span>
              <span className="info-value">
                <span className={`role-badge ${user?.role === "owner" ? "owner" : "member"}`}>
                  <Icon name="shield" size={12} />
                  {roleName}
                </span>
              </span>
            </div>

            <div className="profile-info-row">
              <span className="info-label">{t.profileTenantIdLabel}</span>
              <div className="tenant-id-box">
                <code className="tenant-id-code">{user?.tenant_id}</code>
                <button
                  type="button"
                  className="icon-button copy-btn"
                  onClick={copyTenantId}
                  title={copied ? t.profileCopiedNotice : t.profileCopyId}
                  aria-label={t.profileCopyId}
                >
                  <Icon name={copied ? "check" : "copy"} size={14} />
                  <span className="copy-label">{copied ? t.profileCopiedNotice : t.profileCopyId}</span>
                </button>
              </div>
            </div>

            <div className="profile-info-row">
              <span className="info-label">{t.profileGitHubAppCount}</span>
              <span className="info-value">
                {user?.github_installations_count ?? 0} {vi ? "kho đã kết nối" : "connected installations"}
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Connected Accounts */}
        <section className="panel profile-card">
          <div className="profile-card-header">
            <h2>{t.profileSectionAccounts}</h2>
            <p className="muted">{vi ? "Các dịch vụ định danh bên thứ ba được liên kết với hồ sơ." : "Third-party identity providers linked to your account."}</p>
          </div>

          <div className="accounts-list">
            {/* GitHub */}
            <div className="account-item">
              <div className="account-item-info">
                <span className="provider-icon github-icon">
                  <Icon name="github" size={20} />
                </span>
                <div>
                  <div className="provider-name">GitHub</div>
                  <div className="provider-desc muted">
                    {hasGithub
                      ? (vi ? "Đã liên kết để đăng nhập và phân tích kho mã" : "Linked for sign-in and repo analysis")
                      : (vi ? "Chưa liên kết tài khoản GitHub" : "GitHub account not connected")}
                  </div>
                </div>
              </div>
              <div className="account-item-action">
                {hasGithub ? (
                  <span className="badge-connected">
                    <span className="status-dot green" />
                    {t.profileConnected}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => connectOAuth("github")}
                    disabled={!!busyOAuth}
                  >
                    {busyOAuth === "github" ? <span className="spinner" /> : t.continueGitHub}
                  </button>
                )}
              </div>
            </div>

            {/* Google */}
            <div className="account-item">
              <div className="account-item-info">
                <span className="provider-icon google-icon">G</span>
                <div>
                  <div className="provider-name">Google</div>
                  <div className="provider-desc muted">
                    {hasGoogle
                      ? (vi ? "Đã liên kết tài khoản Google để xác thực an toàn" : "Linked for secure Google OAuth sign-in")
                      : (vi ? "Chưa liên kết tài khoản Google" : "Google account not connected")}
                  </div>
                </div>
              </div>
              <div className="account-item-action">
                {hasGoogle ? (
                  <span className="badge-connected">
                    <span className="status-dot green" />
                    {t.profileConnected}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => connectOAuth("google")}
                    disabled={!!busyOAuth}
                  >
                    {busyOAuth === "google" ? <span className="spinner" /> : t.continueGoogle}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Card 4: Session & Security */}
        <section className="panel profile-card">
          <div className="profile-card-header">
            <h2>{t.profileSectionSecurity}</h2>
            <p className="muted">{vi ? "Quản lý phiên đăng nhập và các cơ chế bảo mật." : "Manage active sessions and security mechanisms."}</p>
          </div>

          <div className="security-box">
            <div className="security-status-row">
              <span className="status-dot green" />
              <span>{t.profileActiveSession}</span>
            </div>
            <p className="security-note muted">
              {vi
                ? "Phiên làm việc được ký bằng HMAC-SHA256 và lưu trong HTTP cookie an toàn (SameSite=Lax). Token không bao giờ lưu trong LocalStorage để phòng chống tấn công XSS."
                : "Active sessions are signed via HMAC-SHA256 and stored in secure HTTP cookies (SameSite=Lax). Tokens are strictly never stored in localStorage to protect against XSS."}
            </p>
            <div className="security-action">
              <button type="button" className="account-link danger-link" onClick={handleLogout}>
                <Icon name="logout" size={16} />
                <span>{t.navSignOut}</span>
              </button>
              <span className="muted text-sm">{t.profileSignOutDesc}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

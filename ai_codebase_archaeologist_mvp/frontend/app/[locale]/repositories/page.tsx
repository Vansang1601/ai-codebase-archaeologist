"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, translations } from "../../../lib/translations";
import LocaleSwitcher from "../../../components/LocaleSwitcher";
import { api, Repo, setToken } from "../../../lib/api";

export default function RepositoriesDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === "vi" ? "vi" : "en";
  const t = translations[locale];
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [url, setUrl] = useState("https://github.com/pallets/flask");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [githubStatus, setGithubStatus] = useState<any>(null);

  useEffect(() => {
    // Verify user session
    api.me()
      .then((u) => {
        setUser(u);
        loadRepos();
        api.githubInstallations().then(setGithubStatus).catch(() => {});
      })
      .catch(() => {
        router.push(`/${locale}/login`);
      });
  }, [locale, router]);

  async function loadRepos() {
    try {
      const data = await api.repos();
      setRepos(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError("");
    try {
      const repo = await api.createRepo(url.trim());
      const job = await api.sync(repo.id);
      router.push(`/repos/${repo.id}?job=${job.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSync(repoId: string) {
    try {
      const job = await api.sync(repoId);
      router.push(`/repos/${repoId}?job=${job.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleSignOut() {
    setToken(null);
    router.push(`/${locale}/login`);
  }

  if (!user) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p className="muted">{locale === "vi" ? "Đang xác thực workspace..." : "Verifying workspace access..."}</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "24px" }}>
      {/* Top Bar with User & Language */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0" }}>
            {t.repositories}
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
            {locale === "vi" ? "Workspace của" : "Workspace for"}: <strong>{user.email}</strong> (Tenant ID: <span style={{ fontFamily: "monospace" }}>{user.tenant_id.slice(0, 8)}...</span>)
          </p>
        </div>
        <div className="row" style={{ gap: "12px" }}>
          <LocaleSwitcher currentLocale={locale} />
          <button
            type="button"
            className="secondary"
            onClick={handleSignOut}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            {t.logout}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* GitHub App Connection Info */}
      {githubStatus?.status === "CONFIGURATION_REQUIRED" && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(110, 168, 254, 0.08)",
            border: "1px solid #2b3d57",
            borderRadius: "12px",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <strong>📦 {locale === "vi" ? "Kết nối GitHub App (Quyền tối thiểu)" : "Connect GitHub App (Minimum Permissions)"}</strong>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
              {t.githubAppNotice}
            </p>
          </div>
          <span className="badge" style={{ borderColor: "#2b3d57", color: "var(--muted)" }}>
            {githubStatus.status}
          </span>
        </div>
      )}

      {/* Main Grid: Add Repo + Repo List */}
      <div className="hero">
        {/* Left Card: Add/Connect Repository */}
        <section className="card stack">
          <div>
            <h2 style={{ fontSize: "18px", margin: "0 0 8px 0" }}>
              {locale === "vi" ? "Thêm Repository" : "Add Repository"}
            </h2>
            <p className="muted" style={{ fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              {t.homeNotice}
            </p>
          </div>

          <form className="stack" onSubmit={handleAddRepo}>
            <label>
              <div className="muted" style={{ fontSize: "12px", marginBottom: "6px" }}>
                {t.repoUrlLabel}
              </div>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </label>
            <button disabled={busy} type="submit">
              {busy ? t.creatingJob : t.analyzeBtn}
            </button>
          </form>
        </section>

        {/* Right Card: Repositories List */}
        <section className="card stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px", margin: 0 }}>
              {locale === "vi" ? "Danh sách Repository" : "Analyzed Repositories"} ({repos.length})
            </h2>
            <button
              type="button"
              className="secondary"
              onClick={loadRepos}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="repo-list">
            {repos.length === 0 && (
              <p className="muted" style={{ textAlign: "center", padding: "20px" }}>
                {t.noRepos}
              </p>
            )}
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="repo-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div className="repo-title" style={{ fontSize: "15px" }}>
                    {repo.owner}/{repo.name}
                  </div>
                  <div className="muted" style={{ fontSize: "12px", marginTop: "3px" }}>
                    SHA: <span style={{ fontFamily: "monospace" }}>{repo.snapshot ? repo.snapshot.commit_sha.slice(0, 8) : "none"}</span>
                    {" · "}
                    {repo.snapshot ? `${repo.snapshot.file_count} files` : "registered"}
                  </div>
                </div>

                <div className="row" style={{ gap: "8px" }}>
                  <span className={`status ${repo.status}`}>{repo.status}</span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleSync(repo.id)}
                    style={{ fontSize: "11px", padding: "5px 10px" }}
                  >
                    Sync
                  </button>
                  <a
                    href={`/repos/${repo.id}`}
                    style={{
                      background: "#2457a6",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

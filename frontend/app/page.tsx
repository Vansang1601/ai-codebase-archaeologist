"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { messageOf, ReadView, Status, useRead } from "./components/WorkspaceUI";

function ArchitecturePreview() {
  const { locale } = useI18n();
  const isVi = locale === "vi";

  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="preview-window">
        <div className="preview-window-bar">
          <div className="window-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="window-title">archaeologist // AST &amp; Dependency Inspector</span>
          <span className="window-tag">SHA: 62b766e</span>
        </div>
        <div className="preview-body">
          <div className="preview-meta-row">
            <div className="preview-badge success">
              <span className="pulse-indicator" />
              <span>{isVi ? "AST Verified" : "AST Verified"}</span>
            </div>
            <div className="preview-badge neutral">
              <span>{isVi ? "160+ Indexed Chunks" : "160+ Indexed Chunks"}</span>
            </div>
            <div className="preview-badge neutral">
              <span>{isVi ? "Blast Radius: 2 hops" : "Blast Radius: 2 hops"}</span>
            </div>
          </div>
          <div className="preview-code-block">
            <div className="code-line">
              <span className="ln">01</span>
              <span className="kw">from</span>{" "}<span className="mod">app.retrieval</span>{" "}<span className="kw">import</span>{" "}<span className="fn">hybrid_retrieve</span>
            </div>
            <div className="code-line">
              <span className="ln">02</span>
              <span className="kw">from</span>{" "}<span className="mod">worker.parser</span>{" "}<span className="kw">import</span>{" "}<span className="fn">extract_symbols</span>
            </div>
            <div className="code-line">
              <span className="ln">03</span>
              <span className="comm"># Grounding check: fail-closed if score &lt; 0.08</span>
            </div>
            <div className="code-line">
              <span className="ln">04</span>
              <span className="kw">async def</span>{" "}<span className="fn">audit_snapshot</span>(repo_id: <span className="typ">str</span>, sha: <span className="typ">str</span>):
            </div>
            <div className="code-line">
              <span className="ln">05</span>
              <span className="tab">&nbsp;&nbsp;</span>evidence = <span className="kw">await</span>{" "}hybrid_retrieve(repo_id, sha)
            </div>
            <div className="code-line">
              <span className="ln">06</span>
              <span className="tab">&nbsp;&nbsp;</span><span className="kw">return</span>{" "}{"{"} grounded: <span className="bool">True</span>, citations: len(evidence) {"}"}
            </div>
          </div>
          <div className="preview-audit-summary">
            <div className="audit-item">
              <span className="audit-label">{isVi ? "Phụ thuộc nội bộ" : "Resolved Deps"}</span>
              <span className="audit-val">main.py ➔ auth ➔ models</span>
            </div>
            <div className="audit-item">
              <span className="audit-label">{isVi ? "Nợ kỹ thuật" : "Tech Debt"}</span>
              <span className="audit-val green">0 Circular Cycles</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const repos = useRead(api.repos);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  const isVi = locale === "vi";

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setError("");
    setCreatedId("");
    setBusy(true);
    try {
      const repo = await api.createRepo(url.trim());
      setCreatedId(repo.id);
      const job = await api.sync(repo.id);
      router.push("/repos/" + repo.id + "?job=" + encodeURIComponent(job.id));
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  function pickSample(sampleUrl: string) {
    setUrl(sampleUrl);
    setError("");
  }

  return (
    <>
      <section id="analyze" className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            <span>{isVi ? "Hệ thống phân tích mã nguồn theo bằng chứng" : "Evidence-First Repository Intelligence"}</span>
          </div>

          <h1 className="hero-headline">
            {isVi ? "Khám phá chiều sâu" : "Inspect codebase"}{" "}
            <em>{isVi ? "mã nguồn." : "architecture."}</em>
          </h1>

          <p className="hero-description">
            {isVi
              ? "Tự động phân tích kho GitHub, trích xuất AST symbols, lần theo đồ thị phụ thuộc và đối chiếu câu trả lời chính xác tới từng dòng code."
              : "Analyze any GitHub repository, map AST dependency graphs, detect technical debt, and ground Q&A with verifiable line citations."}
          </p>

          <form onSubmit={analyze} className="hero-form">
            <label htmlFor="repo-url" className="sr-only">
              {t.inputLabel}
            </label>
            <div className="search-bar">
              <span className="search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </span>
              <input
                id="repo-url"
                type="url"
                required
                maxLength={1000}
                placeholder={t.inputPlaceholder}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
              />
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? (
                  <>
                    <span className="spinner" />
                    <span>{t.btnAnalyzing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.btnAnalyze}</span>
                    <span className="arrow-icon">→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick sample chips */}
          <div className="sample-repos">
            <span className="sample-label">{isVi ? "Thử nhanh:" : "Try sample:"}</span>
            <button
              type="button"
              className="sample-chip"
              onClick={() => pickSample("https://github.com/pallets/click")}
            >
              pallets/click
            </button>
            <button
              type="button"
              className="sample-chip"
              onClick={() => pickSample("https://github.com/pallets/flask")}
            >
              pallets/flask
            </button>
          </div>

          {error && (
            <div className="notice error hero-error" role="alert">
              <span>{error}</span>
              {createdId && <Link href={"/repos/" + createdId}>{t.openToRetry}</Link>}
            </div>
          )}
        </div>

        <ArchitecturePreview />
      </section>

      <section id="library" className="library-section">
        <div className="section-head">
          <div className="library-title-group">
            <h2>{t.libraryTitle}</h2>
            {repos.state.status === "ready" && (
              <span className="repo-count-badge">{repos.state.data.length}</span>
            )}
          </div>
          <button
            className="quiet refresh-btn"
            onClick={repos.retry}
            disabled={repos.state.status === "loading"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{t.btnRefresh}</span>
          </button>
        </div>

        <ReadView read={repos}>
          {(rows) =>
            rows.length === 0 ? (
              <div className="empty-library-card">
                <div className="empty-icon-box">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <h3>{t.emptyLibraryTitle}</h3>
                <p>{t.emptyLibraryDesc}</p>
              </div>
            ) : (
              <div className="repo-cards-grid">
                {rows.map((repo) => (
                  <Link key={repo.id} href={"/repos/" + repo.id} className="repo-card">
                    <div className="repo-card-header">
                      <div className="repo-title-wrapper">
                        <span className="repo-gh-icon" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                          </svg>
                        </span>
                        <strong className="repo-name">
                          <span className="repo-owner">{repo.owner}/</span>{repo.name}
                        </strong>
                      </div>
                      <Status value={repo.status} />
                    </div>

                    <div className="repo-card-meta">
                      {repo.snapshot ? (
                        <>
                          <span className="meta-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            {repo.snapshot.file_count} {t.filesUnit}
                          </span>
                          <span className="meta-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="18" cy="18" r="3" />
                              <circle cx="6" cy="6" r="3" />
                              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                              <line x1="6" y1="9" x2="6" y2="21" />
                            </svg>
                            {repo.snapshot.pr_count ?? 0} PRs
                          </span>
                          <span className="meta-pill sha-pill">
                            SHA {repo.snapshot.commit_sha.slice(0, 7)}
                          </span>
                        </>
                      ) : (
                        <span className="no-snap-text">{t.noSnapshot}</span>
                      )}
                    </div>

                    <div className="repo-card-footer">
                      <span className="open-action">
                        {isVi ? "Xem phân tích" : "View Analysis"} →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          }
        </ReadView>
      </section>
    </>
  );
}

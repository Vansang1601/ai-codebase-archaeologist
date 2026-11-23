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
          <span className="window-title">archaeologist // AST & Dependency Graph</span>
          <span className="window-tag">Snapshot SHA</span>
        </div>
        <div className="preview-body">
          <div className="preview-meta-row">
            <div className="preview-badge success">
              <span className="pulse-indicator" />
              <span>{isVi ? "Xác thực AST hoàn tất" : "AST Verified"}</span>
            </div>
            <div className="preview-badge neutral">
              <span>{isVi ? "Chỉ mục: 160+ chunks" : "Indexed: 160+ chunks"}</span>
            </div>
            <div className="preview-badge neutral">
              <span>{isVi ? "Ảnh hưởng: 2 hops" : "Blast radius: 2 hops"}</span>
            </div>
          </div>
          <div className="preview-code-block">
            <div className="code-line">
              <span className="ln">01</span>
              <span className="kw">from</span> <span className="mod">app.retrieval</span> <span className="kw">import</span> <span className="fn">hybrid_retrieve</span>
            </div>
            <div className="code-line">
              <span className="ln">02</span>
              <span className="kw">from</span> <span className="mod">worker.parser</span> <span className="kw">import</span> <span className="fn">extract_symbols</span>
            </div>
            <div className="code-line">
              <span className="ln">03</span>
              <span className="comm"># Evidence-first: fail-closed if confidence &lt; 0.08</span>
            </div>
            <div className="code-line">
              <span className="ln">04</span>
              <span className="kw">async def</span> <span className="fn">audit_snapshot</span>(repo_id: <span className="typ">str</span>, sha: <span className="typ">str</span>):
            </div>
            <div className="code-line">
              <span className="ln">05</span>
              <span className="tab">&nbsp;&nbsp;</span>evidence = <span className="kw">await</span> hybrid_retrieve(repo_id, sha)
            </div>
            <div className="code-line">
              <span className="ln">06</span>
              <span className="tab">&nbsp;&nbsp;</span><span className="kw">return</span> {"{"} grounded: <span className="bool">True</span>, citations: len(evidence) {"}"}
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
  const { t } = useI18n();
  const router = useRouter();
  const repos = useRead(api.repos);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

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

  return (
    <>
      <section id="analyze" className="landing">
        <div className="intro">
          <h1>
            {t.heroTitle1}
            <br />
            <em>{t.heroTitle2}</em>
          </h1>
          <p>{t.heroSubhead}</p>
          <form onSubmit={analyze} className="analyze-form">
            <label htmlFor="repo-url">{t.inputLabel}</label>
            <div className="entry">
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
              <button disabled={busy}>{busy ? t.btnAnalyzing : t.btnAnalyze}</button>
            </div>
          </form>
          {error && (
            <div className="notice error" role="alert">
              {error}{" "}
              {createdId && <Link href={"/repos/" + createdId}>{t.openToRetry}</Link>}
            </div>
          )}
        </div>
        <ArchitecturePreview />
      </section>

      <section id="library" className="library">
        <div className="section-head">
          <h2>{t.libraryTitle}</h2>
          <button className="quiet" onClick={repos.retry} disabled={repos.state.status === "loading"}>
            {t.btnRefresh}
          </button>
        </div>
        <ReadView read={repos}>
          {(rows) =>
            rows.length === 0 ? (
              <div className="empty-library">
                <span className="book" aria-hidden="true" />
                <div>
                  <h3>{t.emptyLibraryTitle}</h3>
                  <p>{t.emptyLibraryDesc}</p>
                </div>
              </div>
            ) : (
              <ul className="repo-list">
                {rows.map((repo) => (
                  <li key={repo.id}>
                    <Link href={"/repos/" + repo.id} className="repo-row">
                      <span className="book" aria-hidden="true" />
                      <div className="repo-cell">
                        <strong>
                          {repo.owner}/{repo.name}
                        </strong>
                        <small>
                          {repo.snapshot
                            ? `${repo.snapshot.file_count} ${t.filesUnit} · ${repo.snapshot.pr_count ?? 0} PRs · ${repo.snapshot.commit_sha.slice(0, 8)}`
                            : t.noSnapshot}
                        </small>
                      </div>
                      <Status value={repo.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </ReadView>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { messageOf, ReadView, Status, useRead } from "./components/WorkspaceUI";

function SnapshotArt() {
  const { t } = useI18n();
  return (
    <figure className="art" role="img" aria-label="Illustration of three snapshot layers: source code, dependencies, and evidence">
      <div className="art-grid" />
      <div className="sculpture" aria-hidden="true">
        <div className="plate floor" />
        <div className="plate basal" />
        <div className="plate mesh" />
        <div className="plate trace">
          <i /><i /><i />
        </div>
        <div className="plate sheet">
          <div className="sheet-head">
            <b /><b /><b />
          </div>
          <div className="sheet-code">
            {[62, 78, 48, 66, 39, 55].map((w, i) => (
              <i key={w} style={{ width: w + "%", marginLeft: i % 3 === 0 ? 0 : "10%" }} />
            ))}
          </div>
        </div>
      </div>
      <figcaption>
        <span>{t.artSource}</span>
        <span>{t.artDeps}</span>
        <span>{t.artEvidence}</span>
      </figcaption>
    </figure>
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
        <SnapshotArt />
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

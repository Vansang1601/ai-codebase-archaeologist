"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import Icon from "./components/Icon";
import StrataFigure from "./components/StrataFigure";
import { BrandMark, messageOf, ReadView, Status, useRead } from "./components/WorkspaceUI";

export default function HomePage() {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();
  const repos = useRead(api.repos);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [query, setQuery] = useState("");

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
      setError(messageOf(err, locale));
      setBusy(false);
      repos.retry();
    }
  }

  const stages = [
    [vi ? "Chốt phiên bản" : "Capture a snapshot", vi ? "Gắn mã nguồn với một commit." : "Pin the source to a single commit."],
    [vi ? "Lập chỉ mục" : "Index the code", vi ? "Đọc tệp, ký hiệu và quan hệ phụ thuộc." : "Map files, symbols and dependencies."],
    [vi ? "Truy xuất bằng chứng" : "Trace the evidence", vi ? "Liên kết kết quả tới dòng mã gốc." : "Link findings back to source lines."],
  ];

  return <>
    <section id="analyze" className="hero-band">
      <div className="wrap hero-layout">
        <div className="hero-copy">
          <div className="eyebrow"><Icon name="compass" size={15}/>{vi ? "Phân tích kho mã" : "Repository analysis"}</div>
          <h1>{vi ? "Khám phá" : "Explore your"}<br/><em>{vi ? "mã nguồn." : "codebase."}</em></h1>
          <p>{t.heroSubhead}</p>
          <form onSubmit={analyze} className="import-form">
            <label htmlFor="repo-url" className="sr-only">{t.inputLabel}</label>
            <div className="url-field"><Icon name="github" size={19}/>
              <input ref={inputRef} id="repo-url" type="url" autoCapitalize="none" spellCheck={false} required maxLength={1000}
                placeholder="https://github.com/owner/repo" value={url} readOnly={busy}
                onChange={e => { setUrl(e.target.value); setError(""); setCreatedId(""); }} />
            </div>
            <button className="primary" type="submit" disabled={busy}>{busy ? t.btnAnalyzing : t.btnAnalyze}{busy ? <span className="spinner"/> : <Icon name="arrow" size={16}/>}</button>
          </form>
          <div className="samples"><span>{vi ? "Thử với" : "Try with"}</span>
            {["pallets/click", "pallets/flask"].map(sample => <button type="button" key={sample} disabled={busy} onClick={() => {
              setUrl("https://github.com/" + sample); setError(""); setCreatedId(""); inputRef.current?.focus();
            }}>{sample}<Icon name="upRight" size={11}/></button>)}
          </div>
          {error && <div className="notice error" role="alert">{error} {createdId && <Link href={"/repos/" + createdId}>{t.openToRetry}</Link>}</div>}
        </div>
        <StrataFigure/>
      </div>
    </section>

    <div className="wrap lower">
      <div className="library-layout">
        <section id="library" className="library">
          <div className="section-head">
            <div className="heading-inline"><h2>{t.libraryTitle}</h2>{repos.state.status === "ready" && <span className="count">{repos.state.data.length}</span>}</div>
            <button className="quiet small" disabled={repos.state.status === "loading"} onClick={repos.retry}><Icon name="refresh" size={15}/>{t.btnRefresh}</button>
          </div>
          <ReadView read={repos}>{rows => {
            if (!rows.length) return <div className="empty-state">
              <span className="empty-icon"><Icon name="repository" size={25}/></span>
              <h3>{t.emptyLibraryTitle}</h3><p>{t.emptyLibraryDesc}</p>
              <button className="text-action" onClick={() => inputRef.current?.focus()}>{vi ? "Thêm kho GitHub" : "Add a GitHub repository"}<Icon name="arrow" size={14}/></button>
            </div>;
            const filtered = rows.filter(r => (r.owner + "/" + r.name).toLowerCase().includes(query.trim().toLowerCase()));
            return <div className="repo-list">
              {(rows.length > 1 || query) && <label className="repo-filter"><Icon name="search" size={16}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? "Tìm theo chủ sở hữu hoặc tên kho…" : "Filter by owner or repository…"} aria-label={vi ? "Lọc kho mã" : "Filter repositories"}/></label>}
              {filtered.map(r => <Link key={r.id} href={"/repos/" + r.id} className="repo-row">
                <span className="repo-symbol"><Icon name="repository" size={22}/></span>
                <div className="row-details"><strong><span>{r.owner} / </span>{r.name}</strong><small>{r.snapshot ? <><Icon name="commit" size={14}/>{r.snapshot.commit_sha.slice(0,7)} · {r.snapshot.file_count} {t.filesUnit} · {r.snapshot.pr_count ?? 0} PRs</> : t.noSnapshot}</small></div>
                <Status value={r.status}/><Icon name="arrow" size={16}/>
              </Link>)}
              {filtered.length === 0 && <p className="notice">{vi ? "Chưa có kho nào khớp với từ khóa." : "No repositories match this filter."}</p>}
            </div>;
          }}</ReadView>
        </section>
        <aside className="pipeline"><h2><Icon name="branch" size={17}/>{vi ? "Quy trình lập chỉ mục" : "Indexing pipeline"}</h2>
          <ol>{stages.map(([title, body]) => <li key={title}><strong>{title}</strong><p>{body}</p></li>)}</ol>
        </aside>
      </div>
      <section id="about" className="about-section" aria-labelledby="about-heading">
        <div className="about-heading">
          <BrandMark />
          <h2 id="about-heading">{t.introHeading}</h2>
        </div>
        <div className="about-copy">
          <p>{t.aboutPurpose}</p>
          <p>{t.aboutDetails}</p>
        </div>
      </section>
    </div>
  </>;
}

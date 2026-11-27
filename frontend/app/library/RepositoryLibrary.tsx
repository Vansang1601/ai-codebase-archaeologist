"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, setToken } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import Icon from "../components/Icon";
import { ReadView, Status, useRead } from "../components/WorkspaceUI";

export default function RepositoryLibrary() {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();
  const repos = useRead(api.repos);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const unauthorized = repos.state.status === "error"
    && repos.state.error instanceof ApiError && repos.state.error.status === 401;

  useEffect(() => {
    if (unauthorized) {
      setToken(null);
      router.replace("/login");
    }
  }, [unauthorized, router]);

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(vi ? `Bạn có chắc chắn muốn xóa kho "${name}" khỏi thư viện?` : `Are you sure you want to remove "${name}" from your library?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteRepo(id);
      repos.retry();
    } finally {
      setDeletingId(null);
    }
  }

  if (unauthorized) return null;
  return <section className="wrap resource-page" aria-labelledby="library-title">
    <header className="resource-head">
      <h1 id="library-title">{t.libraryTitle}</h1>
      <p>{vi ? "Mở lại một kho để xem kết quả phân tích và phiên bản mã nguồn đã lưu." : "Reopen a repository to explore its analysis and saved snapshot."}</p>
    </header>
    <div className="section-head">
      <div className="heading-inline">
        <h2>{vi ? "Kho mã" : "Repositories"}</h2>
        {repos.state.status === "ready" && <span className="count">{repos.state.data.length}</span>}
      </div>
      <button className="quiet small" disabled={repos.state.status === "loading"} onClick={repos.retry}><Icon name="refresh" size={15}/>{t.btnRefresh}</button>
    </div>
    <ReadView read={repos}>{rows => {
      if (!rows.length) return <div className="empty-state">
        <span className="empty-icon"><Icon name="repository" size={25}/></span>
        <h3>{t.emptyLibraryTitle}</h3><p>{t.emptyLibraryDesc}</p>
        <Link className="text-action" href="/#analyze">{vi ? "Thêm kho GitHub" : "Add a GitHub repository"}<Icon name="arrow" size={14}/></Link>
      </div>;
      const filtered = rows.filter(r => (r.owner + "/" + r.name).toLowerCase().includes(query.trim().toLowerCase()));
      return <div className="repo-list">
        {(rows.length > 1 || query) && <label className="repo-filter"><Icon name="search" size={16}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? "Tìm theo chủ sở hữu hoặc tên kho…" : "Filter by owner or repository…"} aria-label={vi ? "Lọc kho mã" : "Filter repositories"}/></label>}
        {filtered.map(r => <div key={r.id} className="repo-row-wrap">
          <Link href={"/repos/" + r.id + "?from=library"} className="repo-row">
            <span className="repo-symbol"><Icon name="repository" size={22}/></span>
            <div className="row-details">
              <strong><span>{r.owner} / </span>{r.name}</strong>
              <small>{r.snapshot ? <><Icon name="commit" size={14}/>{r.snapshot.commit_sha.slice(0,7)} · {r.snapshot.file_count} {t.filesUnit} · {r.snapshot.symbol_count} symbols · {r.snapshot.pr_count ?? 0} PRs</> : t.noSnapshot}</small>
            </div>
            <Status value={r.status}/>
            <Icon name="arrow" size={16}/>
          </Link>
          <button
            type="button"
            className="icon-button repo-row-delete"
            title={vi ? "Xóa kho" : "Delete repository"}
            disabled={deletingId === r.id}
            onClick={(e) => handleDelete(e, r.id, `${r.owner}/${r.name}`)}
          >
            {deletingId === r.id ? <span className="spinner" /> : <Icon name="audit" size={15} />}
          </button>
        </div>)}
        {filtered.length === 0 && <p className="notice">{vi ? "Chưa có kho nào khớp với từ khóa." : "No repositories match this filter."}</p>}
      </div>;
    }}</ReadView>
    {repos.state.status === "ready" && repos.state.data.length > 0 &&
      <Link className="text-action resource-link" href="/#analyze">{vi ? "Phân tích kho khác" : "Analyze another repository"}<Icon name="arrow" size={15}/></Link>}
  </section>;
}

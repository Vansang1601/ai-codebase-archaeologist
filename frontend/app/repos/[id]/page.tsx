"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type JobInfo, type SourceLocation, type Repo } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Files, Findings, Graph, Overview, PullRequests, Timeline, Ask } from "../../components/RepoPanels";
import Icon from "../../components/Icon";
import StrataFigure from "../../components/StrataFigure";
import { useChat } from "../../components/ChatProvider";
import { messageOf, Status } from "../../components/WorkspaceUI";

function ongoing(status?: string) {
  return status === "queued" || status === "running";
}

function Workspace({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const [repo, setRepo] = useState<Repo | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [tab, setTab] = useState(0);
  const [fromLibrary, setFromLibrary] = useState(false);
  const chat = useChat();
  const { setOpen: setChatOpen, setWorkspace, pending, setPending } = chat;
  const [location, setLocation] = useState<SourceLocation | null>(null);
  const [cited, setCited] = useState<SourceLocation[]>([]);
  const openSource = useCallback((source:SourceLocation) => {
    setLocation(source);
    setTab(1);
    setChatOpen(false);
  }, [setChatOpen]);

  // Share this page's repository with the site-wide chat so citations open here.
  useEffect(() => {
    if (!repo?.snapshot) return;
    setWorkspace({ repo, onOpenSource: openSource, onCitations: setCited });
    return () => setWorkspace(null);
  }, [repo, openSource, setWorkspace]);

  // A citation opened from the chat on another page lands here already selected.
  useEffect(() => {
    if (!pending || pending.repoId !== id || !repo?.snapshot) return;
    setLocation(pending.source);
    setCited(pending.cited);
    setTab(1);
    setPending(null);
  }, [pending, id, repo, setPending]);
  const [revision, setRevision] = useState(0);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const tabDefs = [
    { label: t.tabOverview, Component: Overview, icon: "overview" },
    { label: t.tabFiles, Component: Files, icon: "file" },
    { label: t.tabAsk, Component: Ask, icon: "quote" },
    { label: t.tabTimeline, Component: Timeline, icon: "clock" },
    { label: t.tabGraph, Component: Graph, icon: "graph" },
    { label: t.tabFindings, Component: Findings, icon: "audit" },
    { label: t.tabPulls, Component: PullRequests, icon: "branch" },
  ] as const;

  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const params = new URLSearchParams(window.location.search);
    setFromLibrary(params.get("from") === "library");
    let jobId = params.get("job");

    async function refresh() {
      try {
        const data = await api.repo(id);
        if (!current) return;
        setRepo(data);
        const active = jobId ? await api.job(jobId) : data.active_job;
        if (!jobId && active) jobId = active.id;
        if (!current) return;
        if (active && active.repository_id !== id) jobId = null;
        const related = active?.repository_id === id ? active : null;
        setJob(related);
        setError("");
        if (ongoing(data.status) || ongoing(related?.status)) {
          timer = setTimeout(refresh, 1800);
        }
      } catch (err) {
        if (current) setError(messageOf(err));
      }
    }
    void refresh();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [id, revision]);

  async function sync() {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const next = await api.sync(id);
      const url = new URL(window.location.href);
      url.searchParams.set("job", next.id);
      window.history.replaceState(window.history.state, "", url);
      setJob(next);
      setRevision((v) => v + 1);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteRepo() {
    if (!confirm(vi ? `Bạn có chắc muốn xóa kho "${repo?.owner}/${repo?.name}" và toàn bộ dữ liệu phân tích?` : `Are you sure you want to delete "${repo?.owner}/${repo?.name}" and all indexed analysis?`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteRepo(id);
      window.location.assign("/library");
    } catch (err) {
      setError(messageOf(err));
      setDeleting(false);
    }
  }

  const errorBox = error && (
    <div className="notice error" role="alert">
      {error}{" "}
      <button className="text-action" onClick={() => setRevision((v) => v + 1)}>
        {vi ? "Thử lại" : "Retry"}
      </button>
    </div>
  );

  const backLink = (
    <Link className="crumb" href={fromLibrary ? "/library" : "/#analyze"}>
      <Icon name="back" size={15}/>{fromLibrary ? t.navLibrary : t.navHome}
    </Link>
  );

  if (!repo) {
    return (
      <section className="wrap workspace">
        {backLink}
        {errorBox || <p className="notice" role="status">{t.connecting}</p>}
      </section>
    );
  }

  const ActivePanel = tabDefs[tab]?.Component || Overview;
  const busy = sending || ongoing(job?.status) || ongoing(repo.status);
  const phaseLabel = job ? (t.phases as Record<string, string>)[job.phase] || job.phase : "";

  return (
    <div className="wrap workspace">
      {backLink}
      <div className="workspace-banner">
        <div className="repo-head">
          <div>
            <span className="owner"><Icon name="repository" size={17}/>{repo.owner} /</span>
            <h1>{repo.name}</h1>
          </div>
          <div className="repo-actions">
            <button className="quiet" disabled={busy} onClick={sync} title={vi ? "Đồng bộ lại" : "Resync"}>
              <Icon name="refresh" size={15}/>{busy ? t.btnResyncing : t.btnResync}
            </button>
            <button className="quiet danger-link" disabled={deleting || busy} onClick={handleDeleteRepo} title={vi ? "Xóa kho" : "Delete repository"}>
              {deleting ? <span className="spinner"/> : (vi ? "Xóa kho" : "Delete")}
            </button>
          </div>
        </div>

        <div className="repo-meta">
          <Status value={ongoing(job?.status) ? job!.status : repo.status} />
          {repo.snapshot && <code>SHA {repo.snapshot.commit_sha.slice(0, 12)}</code>}
        </div>
      </div>
      {errorBox}

      {job && (ongoing(job.status) || job.status === "failed") && (
        <div className="job-section">
        <StrataFigure expanded={ongoing(job.status)} phase={job.phase}/>
        <div className="job" role="status">
          <div>
            <strong>{phaseLabel}</strong>
            <span>{job.progress}%</span>
          </div>
          <progress value={job.progress} max={100} aria-label={vi ? "Tiến độ phân tích" : "Indexing progress"} />
          {job.error && <p className="notice error">{job.error}</p>}
        </div></div>
      )}

      {job?.phase==="snapshot_reused" && <p className="notice" role="status">{vi ? "Commit này đã được phân tích. Đang hiển thị kết quả đã lưu." : "This commit has already been indexed. Showing its saved results."}</p>}
      {repo.snapshot ? (
        <>
          <div className="sections-container">
            <nav aria-label={vi ? "Các mục phân tích" : "Analysis sections"} className="sections">
              {tabDefs.map((def, i) => (
                <button
                  key={def.label}
                  className="section-link"
                  aria-current={i === tab ? "page" : undefined}
                  onClick={() => setTab(i)}
                >
                  <Icon name={def.icon} size={16}/>{def.label}
                </button>
              ))}
            </nav>

          </div>
          <ActivePanel key={repo.snapshot.id} repo={repo} location={location} onOpen={openSource} cited={cited} />
        </>
      ) : (
        <div className="panel">
          <h2>{t.noSnapshotTitle}</h2>
          <p className="muted">{busy ? phaseLabel : t.noSnapshotDesc}</p>
        </div>
      )}
    </div>
  );
}

export default function RepoPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace key={id} id={id} />;
}

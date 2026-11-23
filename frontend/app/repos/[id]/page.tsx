"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type JobInfo, type Repo } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { Files, Findings, Graph, Overview, PullRequests, Timeline } from "../../components/RepoPanels";
import FloatingChat from "../../components/FloatingChat";
import { messageOf, Status } from "../../components/WorkspaceUI";

function ongoing(status?: string) {
  return status === "queued" || status === "running";
}

function Workspace({ id }: { id: string }) {
  const { t } = useI18n();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [tab, setTab] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const tabDefs = [
    { label: t.tabOverview, Component: Overview },
    { label: t.tabFiles, Component: Files },
    { label: t.tabTimeline, Component: Timeline },
    { label: t.tabGraph, Component: Graph },
    { label: t.tabFindings, Component: Findings },
    { label: t.tabPulls, Component: PullRequests },
  ] as const;

  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let jobId = new URLSearchParams(window.location.search).get("job");

    async function refresh() {
      try {
        const data = await api.repo(id);
        if (!current) return;
        setRepo(data);
        const active = jobId ? await api.job(jobId) : null;
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

  const errorBox = error && (
    <div className="notice error" role="alert">
      {error}{" "}
      <button className="text-action" onClick={() => setRevision((v) => v + 1)}>
        Retry
      </button>
    </div>
  );

  if (!repo) {
    return (
      <section className="workspace">
        <Link href="/#library">{t.crumbLibrary}</Link>
        {errorBox || <p className="notice" role="status">{t.connecting}</p>}
      </section>
    );
  }

  const ActivePanel = tabDefs[tab]?.Component || Overview;
  const busy = sending || ongoing(job?.status) || ongoing(repo.status);
  const phaseLabel = job ? (t.phases as Record<string, string>)[job.phase] || job.phase : "";

  return (
    <div className="workspace">
      <Link className="crumb" href="/#library">
        {t.crumbLibrary}
      </Link>
      <div className="repo-head">
        <div>
          <span className="owner">{repo.owner} /</span>
          <h1>{repo.name}</h1>
        </div>
        <button className="quiet" disabled={busy} onClick={sync}>
          {busy ? t.btnResyncing : t.btnResync}
        </button>
      </div>

      <div className="repo-meta">
        <Status value={ongoing(job?.status) ? job!.status : repo.status} />
        {repo.snapshot && <code>SHA {repo.snapshot.commit_sha.slice(0, 12)}</code>}
      </div>

      {errorBox}

      {job && (ongoing(job.status) || job.status === "failed") && (
        <div className="job" role="status">
          <div>
            <strong>{phaseLabel}</strong>
            <span>{job.progress}%</span>
          </div>
          <progress value={job.progress} max={100} aria-label="Ingestion progress" />
          {job.error && <p className="notice error">{job.error}</p>}
        </div>
      )}

      {repo.snapshot ? (
        <>
          <div className="sections-container">
            <nav aria-label="Analysis Sections" className="sections">
              {tabDefs.map((def, i) => (
                <button
                  key={def.label}
                  className="section-link"
                  aria-current={i === tab ? "page" : undefined}
                  onClick={() => setTab(i)}
                >
                  {def.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="section-ask-pill"
              onClick={() => setChatOpen(true)}
              title={t.tabAsk}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t.tabAsk}</span>
            </button>
          </div>
          <ActivePanel key={repo.snapshot.id} repo={repo} />
          <FloatingChat repo={repo} isOpen={chatOpen} onToggle={setChatOpen} />
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

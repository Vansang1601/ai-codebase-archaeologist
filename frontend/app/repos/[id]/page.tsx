"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type JobInfo, type Repo } from "../../../lib/api";
import { Ask, Files, Findings, Graph, Overview, Timeline } from "../../components/RepoPanels";
import { messageOf, Status } from "../../components/WorkspaceUI";

const tabs = [
  ["Tổng quan", Overview], ["Mã nguồn", Files], ["Hỏi đáp", Ask],
  ["Lịch sử", Timeline], ["Phụ thuộc", Graph], ["Nợ kỹ thuật", Findings]
] as const;

const phases: Record<string, string> = {
  queued: "Đang chờ worker", claimed: "Đã nhận tác vụ", cloning: "Đang tải kho",
  scanning: "Đang đọc tệp", parsing: "Đang phân tích mã", indexing: "Đang lập chỉ mục",
  history_mapping: "Đang đọc lịch sử", findings: "Đang kiểm tra nợ kỹ thuật",
  failed: "Phân tích thất bại", completed: "Phân tích hoàn tất"
};

function ongoing(status?: string) {
  return status === "queued" || status === "running";
}

function Workspace({ id }: { id: string }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [tab, setTab] = useState(0);
  const [revision, setRevision] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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
        setJob(related); setError("");
        if (ongoing(data.status) || ongoing(related?.status)) {
          timer = setTimeout(refresh, 1800);
        }
      } catch (err) {
        if (current) setError(messageOf(err));
      }
    }
    void refresh();
    return () => { current = false; clearTimeout(timer); };
  }, [id, revision]);

  async function sync() {
    if (sending) return;
    setSending(true); setError("");
    try {
      const next = await api.sync(id);
      const url = new URL(window.location.href);
      url.searchParams.set("job", next.id);
      window.history.replaceState(window.history.state, "", url);
      setJob(next); setRevision(v => v + 1);
    } catch (err) { setError(messageOf(err)); }
    finally { setSending(false); }
  }

  const errorBox = error && <div className="notice error" role="alert">{error} <button className="text-action" onClick={() => setRevision(v => v + 1)}>Tải lại</button></div>;
  if (!repo) return <section className="workspace"><Link href="/">Kho mã</Link>{errorBox || <p className="notice" role="status">Đang mở kho mã…</p>}</section>;
  const Panel = tabs[tab][1];
  const busy = sending || ongoing(job?.status) || ongoing(repo.status);
  return <div className="workspace">
    <Link className="crumb" href="/#library">Kho mã</Link>
    <div className="repo-head"><div><span className="owner">{repo.owner} /</span><h1>{repo.name}</h1></div>
      <button className="quiet" disabled={busy} onClick={sync}>{busy ? "Đang phân tích…" : "Phân tích lại"}</button></div>
    <div className="repo-meta"><Status value={ongoing(job?.status) ? job!.status : repo.status} />
      {repo.snapshot && <code>SHA {repo.snapshot.commit_sha.slice(0, 12)}</code>}</div>
    {errorBox}
    {job && (ongoing(job.status) || job.status === "failed") && <div className="job" role="status">
      <div><strong>{phases[job.phase] || job.phase}</strong><span>{job.progress}%</span></div>
      <progress value={job.progress} max={100} aria-label="Tiến độ phân tích" />{job.error && <p className="notice error">{job.error}</p>}
    </div>}
    {repo.snapshot ? <>
      <nav aria-label="Các mục phân tích" className="sections">{tabs.map(([label], i) =>
        <button className="section-link" aria-current={i === tab ? "page" : undefined} onClick={() => setTab(i)} key={label}>{label}</button>)}</nav>
      <Panel key={repo.snapshot.id} repo={repo} />
    </> : <div className="panel"><h2>Chưa có snapshot hoàn tất</h2><p className="muted">{busy ? "Kết quả sẽ xuất hiện khi worker hoàn tất." : "Chọn Phân tích lại để tạo snapshot cho kho này."}</p></div>}
  </div>;
}

export default function RepoPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace key={id} id={id} />;
}

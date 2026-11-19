"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { messageOf, ReadView, Status, useRead } from "./components/WorkspaceUI";

function SnapshotArt() {
  return <figure className="art" role="img" aria-label="Minh họa ba lớp của một snapshot gồm mã nguồn, phụ thuộc và bằng chứng">
    <div className="art-grid" />
    <div className="sculpture" aria-hidden="true">
      <div className="plate floor" /><div className="plate basal" /><div className="plate mesh" />
      <div className="plate trace"><i /><i /><i /></div>
      <div className="plate sheet">
        <div className="sheet-head"><b /><b /><b /></div>
        <div className="sheet-code">{[62, 78, 48, 66, 39, 55].map((w, i) => <i key={w} style={{ width: w + "%", marginLeft: i % 3 === 0 ? 0 : "10%" }} />)}</div>
      </div>
    </div>
    <figcaption><span>01 &nbsp; Mã nguồn</span><span>02 &nbsp; Phụ thuộc</span><span>03 &nbsp; Bằng chứng</span></figcaption>
  </figure>;
}

export default function HomePage() {
  const router = useRouter();
  const repos = useRead(api.repos);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setError(""); setCreatedId(""); setBusy(true);
    try {
      const repo = await api.createRepo(url.trim());
      setCreatedId(repo.id);
      const job = await api.sync(repo.id);
      router.push('/repos/' + repo.id + '?job=' + encodeURIComponent(job.id));
    } catch (err) {
      setError(messageOf(err)); setBusy(false);
    }
  }

  return <>
    <section id="analyze" className="landing">
      <div className="intro">
        <h1>Đi sâu vào<br /><em>mã nguồn.</em></h1>
        <p>Từ một kho GitHub, lần theo phụ thuộc và tìm câu trả lời đến đúng dòng code.</p>
        <form onSubmit={analyze} className="analyze-form">
          <label htmlFor="repo-url">Liên kết kho GitHub công khai</label>
          <div className="entry"><input id="repo-url" type="url" required maxLength={1000} placeholder="https://github.com/owner/repo" value={url}
            onChange={e => { setUrl(e.target.value); setError(""); }} /><button disabled={busy}>{busy ? "Đang mở…" : "Phân tích kho"}</button></div>
        </form>
        {error && <div className="notice error" role="alert">{error} {createdId && <Link href={'/repos/' + createdId}>Mở kho để thử lại</Link>}</div>}
      </div>
      <SnapshotArt />
    </section>
    <section id="library" className="library">
      <div className="section-head"><h2>Kho mã đã thêm</h2><button className="quiet" onClick={repos.retry} disabled={repos.state.status === "loading"}>Làm mới</button></div>
      <ReadView read={repos}>{rows => rows.length === 0 ?
        <div className="empty-library"><span className="book" aria-hidden="true" /><div><h3>Kho mã đầu tiên của bạn</h3><p>Dán liên kết GitHub ở trên để tạo bản phân tích đầu tiên.</p></div></div>
        : <ul className="repo-list">{rows.map(repo => <li key={repo.id}>
          <Link href={'/repos/' + repo.id} className="repo-row"><span className="book" aria-hidden="true" />
            <div className="repo-cell"><strong>{repo.owner}/{repo.name}</strong><small>{repo.snapshot ? repo.snapshot.file_count + " tệp · " + repo.snapshot.commit_sha.slice(0, 8) : "Chưa có snapshot hoàn tất"}</small></div>
            <Status value={repo.status} /></Link></li>)}</ul>}
      </ReadView>
    </section>
  </>;
}

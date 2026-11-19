"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, Repo } from "../lib/api";

export default function HomePage() {
  const [url, setUrl] = useState("https://github.com/pallets/flask");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try { setRepos(await api.repos()); } catch (e:any) { setError(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const repo = await api.createRepo(url);
      const job = await api.sync(repo.id);
      window.location.href = `/repos/${repo.id}?job=${job.id}`;
    } catch (e:any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="hero">
      <section className="card stack">
        <div>
          <h1>Hiểu codebase bằng bằng chứng, không bằng phỏng đoán.</h1>
          <p className="muted">Nhập một public GitHub repository. Hệ thống chụp snapshot theo commit SHA, phân tích symbol/dependency, lập chỉ mục và trả lời kèm file + dòng mã.</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form className="stack" onSubmit={submit}>
          <label>
            <div className="muted" style={{marginBottom:6}}>GitHub repository URL</div>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/owner/repo" />
          </label>
          <button disabled={busy}>{busy ? "Đang tạo job..." : "Analyze repository"}</button>
        </form>
        <p className="muted" style={{fontSize:13, marginBottom:0}}>MVP chỉ nhận HTTPS github.com và không chạy code/build/test của repository.</p>
      </section>
      <section className="card">
        <h2>Repositories</h2>
        <div className="repo-list">
          {repos.length === 0 && <p className="muted">Chưa có repository nào.</p>}
          {repos.map(repo => (
            <a className="repo-item" href={`/repos/${repo.id}`} key={repo.id}>
              <div>
                <div className="repo-title">{repo.owner}/{repo.name}</div>
                <div className="muted" style={{fontSize:12}}>{repo.snapshot ? repo.snapshot.commit_sha.slice(0,8) : "chưa có snapshot"}</div>
              </div>
              <span className={`status ${repo.status}`}>{repo.status}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

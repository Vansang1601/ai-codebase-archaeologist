"use client";

import { useCallback, useState, type FormEvent } from "react";
import { api, type AskResult, type ImpactResult, type Repo } from "../../lib/api";
import { messageOf, ReadView, Status, useRead } from "./WorkspaceUI";

function sourceUrl(repo: Repo, sha: string, path: string, start?: number | null, end?: number | null) {
  const file = path.split("/").map(encodeURIComponent).join("/");
  const lines = start ? "#L" + start + (end && end > start ? "-L" + end : "") : "";
  return 'https://github.com/' + encodeURIComponent(repo.owner) + '/' + encodeURIComponent(repo.name) + '/blob/' + encodeURIComponent(sha) + '/' + file + lines;
}

export function Overview({ repo }: { repo: Repo }) {
  const s = repo.snapshot!;
  const metrics = [
    ["Tệp đã đọc", s.file_count], ["Ký hiệu mã", s.symbol_count],
    ["Phụ thuộc", s.dependency_count], ["Đoạn đã lập chỉ mục", s.chunk_count]
  ] as const;
  return <section className="panel">
    <h2>Tổng quan snapshot</h2>
    <p className="muted">Dữ liệu được ghi nhận tại một phiên bản của kho mã.</p>
    <dl className="metrics">{metrics.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count.toLocaleString("vi-VN")}</dd></div>)}</dl>
    <dl className="facts"><div><dt>Commit SHA</dt><dd><code>{s.commit_sha}</code></dd></div><div><dt>Nhánh</dt><dd>{s.branch || "Không có thông tin"}</dd></div></dl>
  </section>;
}

function SourceFile({ id, path }: { id: string; path: string }) {
  const read = useRead(useCallback(() => api.file(id, path), [id, path]));
  return <ReadView read={read}>{file => <div className="reader">
    <div className="reader-head"><strong>{file.path}</strong><small>{file.commit_sha.slice(0, 8)}</small></div>
    <pre tabIndex={0} aria-label="Nội dung mã nguồn có số dòng">{file.content.split("\n").map((line, i) => String(i + 1).padStart(4) + "  " + line).join("\n")}</pre>
  </div>}</ReadView>;
}

export function Files({ repo }: { repo: Repo }) {
  const read = useRead(useCallback(() => api.files(repo.id), [repo.id]));
  const [query, setQuery] = useState("");
  const [path, setPath] = useState("");
  return <section className="panel"><h2>Mã nguồn</h2>
    <ReadView read={read}>{files => {
      if (!files.length) return <p className="notice">Snapshot này chưa có tệp.</p>;
      const matches = files.filter(f => f.path.toLowerCase().includes(query.trim().toLowerCase()));
      return <>
        <p className="muted">Tìm trong {files.length.toLocaleString("vi-VN")} tệp đã tải{repo.snapshot && repo.snapshot.file_count > files.length ? " trên tổng số " + repo.snapshot.file_count.toLocaleString("vi-VN") + " tệp" : ""}.</p>
        <div className="explorer"><aside><label htmlFor="file-filter">Lọc đường dẫn</label>
          <input type="search" id="file-filter" value={query} placeholder="app/main.py" onChange={e => setQuery(e.target.value)} />
          <div className="file-list">{matches.length ? matches.map(f =>
            <button className="file" key={f.id} aria-pressed={path === f.path} onClick={() => setPath(f.path)}>{f.path}<small>{f.language} · {f.line_count} dòng</small></button>
          ) : <p className="notice">Không tìm thấy tệp phù hợp.</p>}</div>
        </aside><div>{path ? <SourceFile key={path} id={repo.id} path={path} /> : <p className="notice">Chọn một tệp để đọc mã nguồn.</p>}</div></div>
      </>;
    }}</ReadView>
  </section>;
}

export function Ask({ repo }: { repo: Repo }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (busy || question.trim().length < 2) return;
    setBusy(true); setError(""); setResult(null);
    try { setResult(await api.ask(repo.id, question.trim())); }
    catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  return <section className="panel"><h2>Hỏi về mã nguồn</h2>
    <form onSubmit={ask} className="form-stack"><label htmlFor="question">Câu hỏi về snapshot này</label>
      <textarea id="question" rows={3} minLength={2} maxLength={2000} required readOnly={busy} value={question}
        onChange={e => { setQuestion(e.target.value); setResult(null); setError(""); }} placeholder="Ví dụ: Hàm nào xử lý liên kết kho GitHub?" />
      <button disabled={busy || question.trim().length < 2}>{busy ? "Đang tìm bằng chứng…" : "Gửi câu hỏi"}</button>
    </form>
    {error && <p className="notice error" role="alert">{error}</p>}
    {result && <div className="result" aria-live="polite">
      <h3>{result.grounded ? "Kết quả truy xuất" : "Chưa đủ bằng chứng"}</h3><p className="answer">{result.answer}</p>
      {result.warnings?.map((w, i) => <p className="notice caution" key={i}>{w}</p>)}
      {result.evidence.length > 0 && <ol className="evidence-list">{result.evidence.map((e, i) =>
        <li key={i}><a href={sourceUrl(repo, e.commit_sha, e.path, e.line_start, e.line_end)} target="_blank" rel="noreferrer">[E{i + 1}] {e.path} · L{e.line_start}–L{e.line_end}</a>
          <small>{e.commit_sha.slice(0, 8)} · Điểm truy xuất {e.score.toFixed(3)}{e.symbol_name && " · " + e.symbol_name}</small></li>
      )}</ol>}
    </div>}
  </section>;
}

export function Timeline({ repo }: { repo: Repo }) {
  const read = useRead(useCallback(() => api.timeline(repo.id), [repo.id]));
  return <section className="panel"><h2>Lịch sử commit</h2><p className="muted">Tối đa 100 commit gần nhất đã thu thập của kho.</p>
    <ReadView read={read}>{rows => rows.length ? <ol className="history">{rows.map(commit =>
      <li key={commit.sha}><code>{commit.short_sha}</code><div><strong>{commit.message}</strong><small>{commit.author_name}{commit.committed_at && " · " + new Date(commit.committed_at).toLocaleDateString("vi-VN")}</small></div></li>
    )}</ol> : <p className="notice">Kho này chưa có commit nào trong lịch sử đã thu thập.</p>}</ReadView>
  </section>;
}

export function Graph({ repo }: { repo: Repo }) {
  const read = useRead(useCallback(() => api.graph(repo.id), [repo.id]));
  const [target, setTarget] = useState("");
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function inspect(event: FormEvent) {
    event.preventDefault();
    if (busy || !target.trim()) return;
    setBusy(true); setError(""); setImpact(null);
    try { setImpact(await api.impact(repo.id, target.trim(), 2)); }
    catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }

  return <section className="panel"><h2>Phụ thuộc và ảnh hưởng</h2>
    <ReadView read={read}>{graph => <>
      <p className="muted">Kiểm tra những tệp có thể chịu ảnh hưởng trong tối đa hai bước phụ thuộc ngược.</p>
      <form className="form-stack" onSubmit={inspect}><label htmlFor="target">Đường dẫn tệp cần kiểm tra</label>
        <div className="line-form"><input id="target" list="graph-paths" maxLength={1000} required value={target} readOnly={busy} onChange={e => { setTarget(e.target.value); setImpact(null); setError(""); }} placeholder={graph.nodes[0]?.path || "src/app.py"} />
          <button disabled={busy || !target.trim()}>{busy ? "Đang kiểm tra…" : "Kiểm tra ảnh hưởng"}</button></div>
        <datalist id="graph-paths">{graph.nodes.map(n => <option key={n.id} value={n.path} />)}</datalist></form>
      {error && <p className="notice error" role="alert">{error}</p>}
      {impact && <div className="result" role="status"><h3>{impact.affected.length} tệp chịu ảnh hưởng</h3><p className="muted">{impact.target_path}</p>
        {impact.affected.length > 0 && <ul>{impact.affected.map(p => <li key={p}><code>{p}</code></li>)}</ul>}</div>}
      <h3 className="subhead">Liên kết đã tải ({graph.edges.length})</h3>
      {graph.edges.length ? <ul className="edges">{graph.edges.map(edge =>
        <li key={edge.id}><div><code>{edge.source}</code><span aria-label="phụ thuộc vào"> → </span><code>{edge.target}</code></div>
          <small>{edge.kind} · {edge.evidence_type} · Độ tin cậy {edge.confidence}</small></li>)}</ul>
        : <p className="notice">Chưa tìm thấy liên kết nội bộ.</p>}
    </>}</ReadView>
  </section>;
}

export function Findings({ repo }: { repo: Repo }) {
  const read = useRead(useCallback(() => api.findings(repo.id), [repo.id]));
  const order = { high: 0, medium: 1, info: 2 };
  return <section className="panel"><h2>Nợ kỹ thuật</h2><p className="muted">Các dấu hiệu về kích thước mã, số phụ thuộc và chu trình.</p>
    <ReadView read={read}>{rows => rows.length ? <ul className="findings">{[...rows].sort((a, b) => order[a.severity] - order[b.severity]).map(f =>
      <li key={f.id}><Status value={f.severity} /><h3>{f.title}</h3><p>{f.description}</p>
        {f.evidence_path && <a href={sourceUrl(repo, repo.snapshot!.commit_sha, f.evidence_path, f.line_start, f.line_end)} target="_blank" rel="noreferrer">{f.evidence_path}{f.line_start ? " · L" + f.line_start + "–L" + (f.line_end || f.line_start) : ""}</a>}</li>
    )}</ul> : <p className="notice">Bộ quy tắc hiện tại chưa ghi nhận dấu hiệu nợ kỹ thuật trong snapshot này.</p>}</ReadView>
  </section>;
}

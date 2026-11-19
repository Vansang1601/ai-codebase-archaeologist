"use client";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Repo } from "../../../lib/api";

const tabs = ["overview", "files", "ask", "timeline", "graph", "findings"] as const;
type Tab = typeof tabs[number];

export default function RepoPage() {
  const params = useParams<{ id: string }>();
  const repoId = String(params?.id || "");
  const [repo, setRepo] = useState<Repo | null>(null);
  const [job, setJob] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoId) return;
    const query = new URLSearchParams(window.location.search);
    const jobId = query.get("job");
    if (jobId) api.job(jobId).then(setJob).catch((e:any)=>setError(e.message));
    api.repo(repoId).then(setRepo).catch((e:any)=>setError(e.message));
  }, [repoId]);

  useEffect(() => {
    if (!job || !repoId || ["completed","failed"].includes(job.status)) return;
    const timer = setInterval(async () => {
      try {
        const j = await api.job(job.id); setJob(j);
        if (["completed","failed"].includes(j.status)) setRepo(await api.repo(repoId));
      } catch (e:any) { setError(e.message); }
    }, 1600);
    return () => clearInterval(timer);
  }, [job, repoId]);

  async function sync() {
    if (!repoId) return;
    try { setJob(await api.sync(repoId)); setError(""); } catch(e:any){ setError(e.message); }
  }

  if (!repo) return <div className="card">{error ? <div className="error">{error}</div> : "Đang tải..."}</div>;
  const snap = repo.snapshot;
  return (
    <div className="stack">
      <section className="card">
        <div className="row" style={{justifyContent:"space-between"}}>
          <div>
            <a href="/" className="muted">← repositories</a>
            <h1 style={{marginBottom:4}}>{repo.owner}/{repo.name}</h1>
            <div className="muted">{snap ? `snapshot ${snap.commit_sha}` : "chưa có snapshot hoàn tất"}</div>
          </div>
          <button onClick={sync}>Sync / Analyze</button>
        </div>
        {job && !["completed"].includes(job.status) && (
          <div style={{marginTop:16}}>
            <div className="row" style={{justifyContent:"space-between"}}><span>{job.phase}</span><span>{job.progress}%</span></div>
            <div className="progress"><span style={{width:`${job.progress}%`}} /></div>
            {job.error && <div className="error" style={{marginTop:10}}>{job.error}</div>}
          </div>
        )}
      </section>
      {error && <div className="error">{error}</div>}
      <nav className="tabs">
        {tabs.map(t => <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>)}
      </nav>
      {!snap ? <div className="card"><p>Hãy chạy Analyze và đợi job hoàn tất.</p></div> : (
        <>
          {tab === "overview" && <Overview repo={repo} />}
          {tab === "files" && <Files repoId={repoId} />}
          {tab === "ask" && <Ask repoId={repoId} />}
          {tab === "timeline" && <Timeline repoId={repoId} />}
          {tab === "graph" && <Graph repoId={repoId} />}
          {tab === "findings" && <Findings repoId={repoId} />}
        </>
      )}
    </div>
  );
}

function Overview({repo}:{repo:Repo}) {
  const s = repo.snapshot!;
  return <section className="card">
    <h2>Snapshot overview</h2>
    <div className="grid">
      <div className="stat"><span className="muted">Files</span><strong>{s.file_count}</strong></div>
      <div className="stat"><span className="muted">Symbols</span><strong>{s.symbol_count}</strong></div>
      <div className="stat"><span className="muted">Dependencies</span><strong>{s.dependency_count}</strong></div>
      <div className="stat"><span className="muted">Chunks</span><strong>{s.chunk_count}</strong></div>
    </div>
    <p className="muted">Mọi dữ liệu phía dưới thuộc commit SHA cố định <code>{s.commit_sha}</code>.</p>
  </section>;
}

function Files({repoId}:{repoId:string}) {
  const [files,setFiles]=useState<any[]>([]); const [selected,setSelected]=useState<any>(null); const [error,setError]=useState("");
  useEffect(()=>{ api.files(repoId).then(setFiles).catch((e:any)=>setError(e.message)); },[repoId]);
  async function open(path:string){ try{setSelected(await api.file(repoId,path));}catch(e:any){setError(e.message);} }
  return <section className="card">
    <h2>Code explorer</h2>{error&&<div className="error">{error}</div>}
    <div className="two-col">
      <div className="file-list">{files.map(f=><button className="file-row" key={f.path} onClick={()=>open(f.path)}>{f.path}<div className="muted" style={{fontSize:11}}>{f.language} · {f.line_count} lines</div></button>)}</div>
      <div>{selected ? <><div className="row" style={{justifyContent:"space-between"}}><strong>{selected.path}</strong><span className="muted">{selected.commit_sha.slice(0,8)}</span></div><pre className="code">{withLineNumbers(selected.content)}</pre></> : <p className="muted">Chọn một file để xem source snapshot.</p>}</div>
    </div>
  </section>;
}

function withLineNumbers(content:string){ return content.split("\n").map((x,i)=>`${String(i+1).padStart(4," ")}  ${x}`).join("\n"); }

function Ask({repoId}:{repoId:string}) {
  const [q,setQ]=useState("Module chính của repository này làm gì?"); const [result,setResult]=useState<any>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{setResult(await api.ask(repoId,q));}catch(e:any){setError(e.message);}finally{setBusy(false);}}
  return <section className="card stack"><h2>Grounded Q&A</h2><form className="stack" onSubmit={submit}><textarea rows={4} value={q} onChange={e=>setQ(e.target.value)} /><button disabled={busy}>{busy?"Đang truy xuất...":"Ask"}</button></form>{error&&<div className="error">{error}</div>}{result&&<><div className={result.grounded?"answer":"warning"}>{result.answer}</div>{result.warnings?.map((w:string)=><div className="warning" key={w}>{w}</div>)}<div className="stack"><h3>Evidence</h3>{result.evidence.length===0?<p className="muted">Không có evidence đủ ngưỡng.</p>:result.evidence.map((e:any,i:number)=><div className="evidence" key={`${e.path}-${i}`}><div><strong>[E{i+1}] {e.path}:{e.line_start}-{e.line_end}</strong></div><div className="muted">score {e.score} · sha {e.commit_sha.slice(0,8)}</div>{e.github_url&&<a href={e.github_url} target="_blank" rel="noopener noreferrer">Open exact source ↗</a>}</div>)}</div></>}</section>;
}

function Timeline({repoId}:{repoId:string}) {
  const [rows,setRows]=useState<any[]>([]); useEffect(()=>{api.timeline(repoId).then(setRows)},[repoId]);
  return <section className="card"><h2>Commit timeline</h2><div className="table-wrap"><table><thead><tr><th>SHA</th><th>When</th><th>Author</th><th>Message</th></tr></thead><tbody>{rows.map(c=><tr key={c.sha}><td><code>{c.short_sha}</code></td><td>{c.committed_at?new Date(c.committed_at).toLocaleString():""}</td><td>{c.author_name}</td><td>{c.message}</td></tr>)}</tbody></table></div></section>;
}

function Graph({repoId}:{repoId:string}) {
  const [graph,setGraph]=useState<any>(null); const [impact,setImpact]=useState<any>(null); const [target,setTarget]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{api.graph(repoId).then(g=>{setGraph(g); if(g.nodes?.[0]) setTarget(g.nodes[0].path)}).catch((e:any)=>setError(e.message));},[repoId]);
  async function runImpact(){try{setImpact(await api.impact(repoId,target,2));}catch(e:any){setError(e.message);}}
  return <section className="card stack"><h2>Dependency / impact</h2>{error&&<div className="error">{error}</div>}<div className="row"><input value={target} onChange={e=>setTarget(e.target.value)} placeholder="path"/><button onClick={runImpact}>Impact depth 2</button></div>{impact&&<div className="answer"><strong>Affected:</strong> {impact.affected.length?impact.affected.join(", "):"none"}</div>}<div className="graph">{!graph?<span>loading...</span>:graph.edges.length===0?<span className="muted">No resolved local dependencies.</span>:graph.edges.map((e:any)=><div className="graph-edge" key={e.id}><code>{e.source}</code> → <code>{e.target}</code> <span className="muted">({e.kind}, {e.evidence_type})</span></div>)}</div></section>;
}

function Findings({repoId}:{repoId:string}) {
  const [rows,setRows]=useState<any[]>([]); useEffect(()=>{api.findings(repoId).then(setRows)},[repoId]);
  return <section className="card"><h2>Technical debt findings</h2>{rows.length===0?<p className="muted">Không có finding theo các rule MVP hiện tại.</p>:<div className="stack">{rows.map(x=><div className="evidence" key={x.id}><div className={`severity-${x.severity}`}><strong>{x.severity.toUpperCase()} · {x.title}</strong></div><p>{x.description}</p>{x.evidence_path&&<div className="muted">Evidence: {x.evidence_path}{x.line_start?`:${x.line_start}-${x.line_end}`:""}</div>}</div>)}</div>}</section>;
}

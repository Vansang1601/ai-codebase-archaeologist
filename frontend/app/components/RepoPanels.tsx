"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type AskResult, type FileDetail, type SourceLocation, type Repo } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import FileTree from "./FileTree";
import FileMap from "./FileMap";
export { default as Graph } from "./DependencyMap";
import Icon from "./Icon";
import CodeEditPanel from "./CodeEdit";
import { messageOf, ReadView, Status, useRead } from "./WorkspaceUI";

function sourceUrl(repo: Repo, sha: string, path: string, start?: number | null, end?: number | null) {
  const file = path.split("/").map(encodeURIComponent).join("/");
  const lines = start ? "#L" + start + (end && end > start ? "-L" + end : "") : "";
  return (
    "https://github.com/" +
    encodeURIComponent(repo.owner) +
    "/" +
    encodeURIComponent(repo.name) +
    "/blob/" +
    encodeURIComponent(sha) +
    "/" +
    file +
    lines
  );
}

export function Overview({ repo }: { repo: Repo }) {
  const { t, locale } = useI18n();
  const s = repo.snapshot!;
  const metrics = [
    [t.statFiles, "file_count"],
    [t.statSymbols, "symbol_count"],
    [t.statDeps, "dependency_count"],
    [t.statChunks, "chunk_count"],
    [t.statPulls, "pr_count"],
  ] as const;

  return (
    <section className="panel">
      <h2>{t.tabOverview}</h2>
      <p className="muted">
        {locale === "vi" ? "Số liệu của phiên bản đã lập chỉ mục." : "Index totals for this revision."}
      </p>
      <dl className="metrics">
        {metrics.map(([name, key]) => {
          const values = (repo.snapshot_history || []).map((point) => point[key] ?? 0);
          const min = Math.min(...values),
            max = Math.max(...values);
          const points = values
            .map((v, i) =>
              [
                2 + (i * 106) / (values.length - 1),
                max === min ? 15 : 27 - ((v - min) * 24) / (max - min),
              ].join(","),
            )
            .join(" ");
          return (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{(s[key] ?? 0).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</dd>
              {values.length >= 2 && (
                <svg
                  viewBox="0 0 110 30"
                  className="spark"
                  role="img"
                  aria-label={name + " · " + values.join(" → ")}
                >
                  <title>{values.join(" → ")}</title>
                  <polyline points={points} />
                </svg>
              )}
            </div>
          );
        })}
      </dl>
      <p className="metric-note">
        {(repo.snapshot_history?.length || 0) > 1
          ? (locale === "vi" ? "Xu hướng qua các phiên bản đã phân tích" : "Trend across indexed revisions") +
            " · " +
            repo.snapshot_history!.length
          : locale === "vi"
            ? "Xu hướng sẽ xuất hiện từ phiên bản đã phân tích thứ hai."
            : "Trends appear after a second revision has been indexed."}
      </p>
      <dl className="facts">
        <div>
          <dt>{t.factSha}</dt>
          <dd>
            <code>{s.commit_sha}</code>
          </dd>
        </div>
        <div>
          <dt>{t.factBranch}</dt>
          <dd>{s.branch || t.factBranchUnknown}</dd>
        </div>
      </dl>
    </section>
  );
}

function CodeReader({ file, location }: { file: FileDetail; location: SourceLocation }) {
  const { locale } = useI18n();
  const mark = useRef<HTMLElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const reader = pre.current;
    if (!reader) return;
    if (mark.current)
      reader.scrollTop += mark.current.getBoundingClientRect().top - reader.getBoundingClientRect().top - 48;
    reader.focus({ preventScroll: true });
    reader.scrollIntoView({ block: "nearest" });
  }, [location]);
  const lines = file.content.split("\n").map((line, i) => String(i + 1).padStart(4) + "  " + line);
  const start = location.line_start || 0,
    end = location.line_end || start;
  return (
    <div className="reader">
      <div className="reader-head">
        <strong>{file.path}</strong>
        <small>{file.commit_sha.slice(0, 8)}</small>
      </div>
      <pre
        ref={pre}
        tabIndex={0}
        aria-label={locale === "vi" ? "Mã nguồn kèm số dòng" : "Source code with line numbers"}
      >
        {start > 0 && start <= lines.length ? (
          <>
            {start > 1 && lines.slice(0, start - 1).join("\n") + "\n"}
            <mark ref={mark}>{lines.slice(start - 1, end).join("\n")}</mark>
            {end < lines.length && "\n" + lines.slice(end).join("\n")}
          </>
        ) : (
          lines.join("\n")
        )}
      </pre>
    </div>
  );
}

function SourceFile({ id, location }: { id: string; location: SourceLocation }) {
  const { path, commit_sha } = location;
  const read = useRead(useCallback(() => api.file(id, path, commit_sha), [id, path, commit_sha]));
  return <ReadView read={read}>{(file) => <><CodeReader file={file} location={location} /><CodeEditPanel key={`${path}:${commit_sha}:${location.line_start}:${location.line_end}`} id={id} file={file} location={location}/></>}</ReadView>;
}

export function Files({
  repo,
  location,
  onOpen,
  cited,
}: {
  repo: Repo;
  location: SourceLocation | null;
  onOpen: (source: SourceLocation) => void;
  cited: SourceLocation[];
}) {
  const { t, locale } = useI18n();
  const sha = repo.snapshot!.commit_sha;
  const read = useRead(useCallback(() => api.files(repo.id, sha), [repo.id, sha]));
  const [query, setQuery] = useState("");
  const path = location?.path || "";
  const setPath = (path: string) => onOpen({ path, commit_sha: repo.snapshot!.commit_sha });

  return (
    <section className="panel">
      <h2>{t.filesHeading}</h2>
      <ReadView read={read}>
        {(files) => {
          if (!files.length) return <p className="notice">{t.filesEmpty}</p>;
          const matches = files.filter((f) => f.path.toLowerCase().includes(query.trim().toLowerCase()));
          return (
            <>
              <p className="muted">
                {t.filesCountText} {files.length.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}{" "}
                {repo.snapshot && repo.snapshot.file_count > files.length
                  ? ` / ${repo.snapshot.file_count.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")} ${t.filesCountTotal}`
                  : t.filesCountTotal}
                .
              </p>
              <div className="explorer">
                <aside>
                  <label htmlFor="file-filter">{t.filesFilterLabel}</label>
                  <input
                    type="search"
                    id="file-filter"
                    value={query}
                    placeholder={t.filesFilterPlaceholder}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <FileTree
                    files={matches}
                    active={path}
                    cited={cited}
                    sha={repo.snapshot!.commit_sha}
                    filtering={Boolean(query.trim())}
                    open={setPath}
                  />
                </aside>
                <div>
                  {location ? (
                    <SourceFile key={location.commit_sha + path} id={repo.id} location={location} />
                  ) : (
                    <p className="notice">{t.filesPrompt}</p>
                  )}
                  <FileMap files={matches} active={path} open={setPath} />
                </div>
              </div>
            </>
          );
        }}
      </ReadView>
    </section>
  );
}

export function Ask({
  repo,
  onOpen,
}: {
  repo: Repo;
  onOpen?: (location: SourceLocation) => void;
}) {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const presets = [
    {
      id: "architecture",
      label: vi ? "Giải phẫu Kiến trúc" : "Architecture Anatomy",
      prompt: vi
        ? "Phân tích kiến trúc tổng thể của kho mã này: Luồng dữ liệu, entrypoint chính và cách các module kết nối với nhau."
        : "Analyze the overall architecture of this codebase: core data flow, main entrypoints, and how modules interconnect.",
    },
    {
      id: "security",
      label: vi ? "Giám định An ninh" : "Security & Vulnerabilities",
      prompt: vi
        ? "Kiểm tra an ninh và các điểm rủi ro tiềm ẩn: Luồng xác thực, kiểm tra input, quản lý secret và phân quyền truy cập."
        : "Audit security and potential vulnerabilities: authentication flows, input validation, secret handling, and access controls.",
    },
    {
      id: "impact",
      label: vi ? "Rủi ro khi Sửa đổi" : "Blast Radius & Risk",
      prompt: vi
        ? "Chỉ ra các module và hàm trọng yếu nhất có nguy cơ gây ảnh hưởng dây chuyền (Blast Radius) khi bị sửa đổi."
        : "Identify high-risk core modules and functions with the largest blast radius when modified.",
    },
    {
      id: "debt",
      label: vi ? "Nợ kỹ thuật & Điểm nghẽn" : "Debt & Hotspots",
      prompt: vi
        ? "Xác định các tệp và hàm có độ phức tạp cao, quá nhiều phụ thuộc hoặc có dấu hiệu God Object cần refactor."
        : "Spot high-complexity files, excessive coupling, or God object patterns that require refactoring.",
    },
    {
      id: "provenance",
      label: vi ? "Lịch sử & Nguồn gốc" : "Provenance & History",
      prompt: vi
        ? "Truy vết sự tiến hóa của kho mã: Những thay đổi và tính năng quan trọng nhất được phát triển qua các commit."
        : "Trace repository evolution: key architectural changes and features added across historical commits.",
    },
  ];

  async function executeInspection(promptText: string) {
    if (busy || promptText.trim().length < 2) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.ask(repo.id, promptText.trim()));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSelectPreset(preset: (typeof presets)[0]) {
    setActivePreset(preset.id);
    setQuestion(preset.prompt);
    setResult(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    executeInspection(question);
  }

  return (
    <section className="panel inspector-panel">
      <div className="inspector-head">
        <div className="inspector-title-row">
          <span className="inspector-badge">
            <Icon name="sparkles" size={14} />
            {vi ? "AI CODE INSPECTOR" : "AI CODE INSPECTOR"}
          </span>
          <span className="inspector-tag">Evidence-First Grounded Engine</span>
        </div>
        <h2>{vi ? "Soi Mã Nguồn & Giám Định Chuyên Sâu" : "Deep Code & Architecture Inspection"}</h2>
        <p className="muted">
          {vi
            ? "Mổ xẻ cú pháp AST, bóc tách cấu trúc hàm/lớp, thẩm tra bảo mật và đối chiếu bằng chứng mã nguồn tĩnh (kết luận cần được kiểm tra)."
            : "Deep AST dissection, function/class decomposition, security auditing, and static evidence verification with reviewable citations."}
        </p>
      </div>

      {/* Preset Inspection Modes */}
      <div className="inspector-presets-wrap">
        <span className="presets-label">
          <Icon name="zap" size={13} />
          {vi ? "Chế độ giám định tức thì:" : "Instant Inspection Modes:"}
        </span>
        <div className="inspector-presets">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`preset-chip${activePreset === p.id ? " active" : ""}`}
              onClick={() => handleSelectPreset(p)}
              disabled={busy}
            >
              <Icon name={p.id === "architecture" ? "layers" : p.id === "security" ? "shieldAlert" : p.id === "impact" ? "graph" : p.id === "debt" ? "audit" : "clock"} size={16}/>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Inspection Form */}
      <form onSubmit={handleSubmit} className="form-stack inspector-form">
        <label htmlFor="inspector-input" className="inspector-input-label">
          <Icon name="inspect" size={14} />
          {vi ? "Nội dung giám định cụ thể:" : "Specific Code Inspection Query:"}
        </label>
        <div className="inspector-input-box">
          <textarea
            id="inspector-input"
            rows={3}
            minLength={2}
            maxLength={2000}
            required
            readOnly={busy}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setError("");
            }}
            placeholder={
              vi
                ? "Ví dụ: Module nào xử lý liên kết kho GitHub và lưu database? Chỉ ra các lỗ hổng tiềm ẩn..."
                : "e.g., Which module handles GitHub connections and database persistence? Identify potential risks..."
            }
          />
          <button
            type="submit"
            className="primary inspector-submit-btn"
            disabled={busy || question.trim().length < 2}
          >
            {busy ? (
              <>
                <span className="spinner" />
                {vi ? "Đang soi mã..." : "Inspecting..."}
              </>
            ) : (
              <>
                <Icon name="sparkles" size={15} />
                {vi ? "Bắt đầu Giám định" : "Run Inspection"}
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {/* Inspection Dossier Results */}
      {result && (
        <div className="inspector-dossier" aria-live="polite">
          <div className="dossier-header">
            <div className="dossier-status">
              <span className={`status-pill ${result.grounded ? "grounded" : "ungrounded"}`}>
                <Icon name={result.grounded ? "check" : "audit"} size={13} />
                {result.grounded
                  ? (vi ? "CÓ DẪN CHỨNG MÃ NGUỒN" : "SOURCE EVIDENCE AVAILABLE")
                  : (vi ? "CẦN KIỂM TRA / AI CHƯA KHẢ DỤNG" : "REVIEW REQUIRED / AI UNAVAILABLE")}
              </span>
              {result.evidence.length > 0 && (
                <span className="evidence-count">
                  {result.evidence.length} {vi ? "bằng chứng đối chiếu" : "cited evidences"}
                </span>
              )}
            </div>
            {repo.snapshot && (
              <span className="dossier-sha">
                <Icon name="commit" size={12} />
                <code>{repo.snapshot.commit_sha.slice(0, 8)}</code>
              </span>
            )}
          </div>

          <div className="dossier-content">
            <h3 className="dossier-heading">
              {vi ? "Kết quả Giám định Kỹ thuật:" : "Technical Inspection Findings:"}
            </h3>
            <div className="dossier-answer">{result.answer}</div>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="dossier-warnings">
              {result.warnings.map((w, i) => (
                <p className="notice caution" key={i}>
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Evidence Citations Table / Grid */}
          {result.evidence.length > 0 && (
            <div className="dossier-evidences">
              <h4>{vi ? "Hồ sơ Bằng chứng Đối chiếu (Citing Evidences):" : "Verified Code Evidences:"}</h4>
              <div className="evidence-grid">
                {result.evidence.map((e, i) => (
                  <div key={i} className="evidence-card">
                    <div className="evidence-card-head">
                      <span className="evidence-index">[E{i + 1}]</span>
                      <strong className="evidence-path">{e.path}</strong>
                      <span className="evidence-score" title={t.scoreLabel}>
                        {e.score.toFixed(3)}
                      </span>
                    </div>

                    <div className="evidence-meta">
                      <span className="evidence-lines">
                        {vi ? "Dòng" : "Lines"} L{e.line_start}–L{e.line_end}
                      </span>
                      {e.symbol_name && (
                        <span className="evidence-symbol">
                          <code>{e.symbol_name}</code>
                        </span>
                      )}
                    </div>

                    <div className="evidence-actions">
                      {onOpen && (
                        <button
                          type="button"
                          className="quiet small"
                          onClick={() =>
                            onOpen({
                              path: e.path,
                              commit_sha: e.commit_sha,
                              line_start: e.line_start,
                              line_end: e.line_end,
                            })
                          }
                          title={vi ? "Mở trong trình duyệt tệp" : "Open in File Reader"}
                        >
                          <Icon name="file" size={13} />
                          {vi ? "Soi & sửa tại dòng" : "Inspect & edit lines"}
                        </button>
                      )}
                      <a
                        className="quiet small external-link"
                        href={sourceUrl(repo, e.commit_sha, e.path, e.line_start, e.line_end)}
                        target="_blank"
                        rel="noreferrer"
                        title={vi ? "Xem trên GitHub" : "View on GitHub"}
                      >
                        <Icon name="github" size={13} />
                        GitHub
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export const CodeInspector = Ask;

export function Timeline({ repo }: { repo: Repo }) {
  const { t, locale } = useI18n();
  const read = useRead(useCallback(() => api.timeline(repo.id), [repo.id]));

  return (
    <section className="panel">
      <h2>{t.timelineHeading}</h2>
      <p className="muted">{t.timelineSubhead}</p>
      <ReadView read={read}>
        {(rows) =>
          rows.length ? (
            <ol className="history layers-history" aria-label={t.timelineHeading}>
              {rows.map((commit) => (
                <li key={commit.sha}>
                  <div className="commit-stratum">
                    <i
                      style={{
                        height:
                          commit.additions == null
                            ? 3
                            : Math.min(
                                34,
                                3 + Math.log2(1 + commit.additions + (commit.deletions || 0)) * 2.1,
                              ),
                        background:
                          commit.additions == null
                            ? "var(--rule)"
                            : "hsl(" +
                              Array.from(commit.author_name).reduce(
                                (a, c) => (a * 31 + c.charCodeAt(0)) % 360,
                                0,
                              ) +
                              " 36% 47%)",
                      }}
                    />
                    <code>{commit.short_sha}</code>
                  </div>
                  <div>
                    <strong>{commit.message}</strong>
                    <small>
                      {commit.additions == null
                        ? locale === "vi"
                          ? "Chưa có thống kê dòng"
                          : "Line counts unavailable"
                        : "+" + commit.additions + " / −" + commit.deletions}{" "}
                      · {commit.author_name}
                      {commit.committed_at &&
                        " · " +
                          new Date(commit.committed_at).toLocaleDateString(
                            locale === "vi" ? "vi-VN" : "en-US",
                          )}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="notice">{t.timelineEmpty}</p>
          )
        }
      </ReadView>
    </section>
  );
}

export function Findings({ repo, onOpen }: { repo: Repo; onOpen: (location: SourceLocation) => void }) {
  const { t, locale } = useI18n();
  const read = useRead(useCallback(() => api.findings(repo.id), [repo.id]));
  const order = { high: 0, medium: 1, info: 2 };
  const [severity, setSeverity] = useState("all");
  const [filter, setFilter] = useState("");
  const vi = locale === "vi";
  const advice: Record<string,string> = {
    large_file: vi ? "Xem trách nhiệm của tệp và chia theo chức năng nếu hợp lý; thêm test trước khi tách." : "Review responsibilities and split by cohesion if appropriate; add tests first.",
    large_symbol: vi ? "Xác định các bước độc lập, tách hàm nhỏ và kiểm tra hành vi." : "Identify independent steps, extract smaller functions and verify behavior.",
    high_out_coupling: vi ? "Kiểm tra ranh giới module và giảm các phụ thuộc không cần thiết." : "Review module boundaries and unnecessary dependencies.",
    dependency_cycle: vi ? "Xem đường dẫn vòng lặp, cân nhắc tách interface hoặc đảo chiều phụ thuộc." : "Inspect the cycle; consider extracting an interface or inverting a dependency."
  };

  return (
    <section className="panel">
      <h2>{t.findingsHeading}</h2>
      <p className="muted">{t.findingsSubhead}</p>
      <p className="notice">{vi ? "Đây là dấu hiệu phân tích tĩnh, không phải kết luận chắc chắn về lỗi." : "These are static-analysis signals, not confirmed defects."}</p>
      <div className="graph-tools"><label>{vi?"Mức độ":"Severity"} <select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="all">{vi?"Tất cả":"All"}</option><option value="high">{vi?"Cao":"High"}</option><option value="medium">{vi?"Vừa":"Medium"}</option><option value="info">{vi?"Thông tin":"Info"}</option></select></label><input type="search" aria-label={vi?"Tìm dấu hiệu":"Search findings"} placeholder={vi?"Tìm theo tệp hoặc tên":"Filter by file or title"} value={filter} onChange={e=>setFilter(e.target.value)}/></div>
      <ReadView read={read}>
        {(rows) =>
          rows.some(f=>(severity==="all"||f.severity===severity)&&`${f.title} ${f.evidence_path||""}`.toLowerCase().includes(filter.toLowerCase())) ? (
            <ul className="findings">
              {[...rows]
                .filter(f=>(severity==="all"||f.severity===severity)&&`${f.title} ${f.evidence_path||""}`.toLowerCase().includes(filter.toLowerCase()))
                .sort((a, b) => order[a.severity] - order[b.severity])
                .map((f) => (
                  <li key={f.id}>
                    <span className="depth" data-depth={3 - order[f.severity]}>
                      <span aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      {(t.status as Record<string, string>)[f.severity] || f.severity}
                    </span>
                    <h3>{vi ? (({large_file:"Tệp lớn",large_symbol:"Hàm/lớp lớn",high_out_coupling:"Nhiều phụ thuộc",dependency_cycle:"Vòng phụ thuộc"} as Record<string,string>)[f.kind] || f.title) : f.title}</h3>
                    {vi && f.evidence_path && <code>{f.evidence_path}</code>}
                    <p>{vi && f.kind === "large_file" ? `Tệp có ${f.meta.line_count} dòng. Kích thước không tự chứng minh thiết kế kém.` : vi && f.kind === "large_symbol" ? `Ký hiệu ${f.meta.symbol} có ${f.meta.lines} dòng.` : vi && f.kind === "high_out_coupling" ? `Có ${f.meta.out_degree} phụ thuộc đi (ngưỡng ${f.meta.threshold}).` : f.description}</p>
                    {advice[f.kind] && <p className="finding-advice"><strong>{vi?"Hướng xử lý: ":"Suggested review: "}</strong>{advice[f.kind]}</p>}
                    {f.excerpt?.length > 0 && (
                      <pre className="snippet">
                        {f.excerpt
                          .map((line, i) => String((f.line_start || 1) + i).padStart(3) + "  " + line)
                          .join("\n")}
                      </pre>
                    )}
                    {f.evidence_path && (
                      <button
                        className="quiet small"
                        onClick={() =>
                          onOpen({
                            path: f.evidence_path!,
                            commit_sha: f.commit_sha,
                            line_start: f.line_start,
                            line_end: f.line_end,
                          })
                        }
                      >
                        <Icon name="file" size={14} />
                        {locale === "vi" ? "Mở trong trình duyệt tệp" : "Open in file explorer"}
                      </button>
                    )}
                    {f.evidence_path && (
                      <a
                        className="finding-link"
                        href={sourceUrl(repo, f.commit_sha, f.evidence_path, f.line_start, f.line_end)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.evidence_path}
                        {f.line_start ? " · L" + f.line_start + "–L" + (f.line_end || f.line_start) : ""}
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="notice">{t.findingsEmpty}</p>
          )
        }
      </ReadView>
    </section>
  );
}

export function PullRequests({ repo }: { repo: Repo }) {
  const { t, locale } = useI18n();
  const read = useRead(useCallback(() => api.pulls(repo.id), [repo.id]));

  return (
    <section className="panel">
      <h2>{t.pullsHeading}</h2>
      <p className="muted">{t.pullsSubhead}</p>
      <ReadView read={read}>
        {(rows) =>
          rows.length ? (
            <ol className="history">
              {rows.map((pr) => (
                <li key={pr.id}>
                  <Status value={pr.merged_at ? "merged" : pr.state} />
                  <div>
                    <strong>
                      <a
                        href={`https://github.com/${repo.owner}/${repo.name}/pull/${pr.number}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        #{pr.number} {pr.title}
                      </a>
                    </strong>
                    <small>
                      @{pr.author_name}
                      {pr.base_branch && ` · base: ${pr.base_branch}`}
                      {pr.head_sha && ` · head: ${pr.head_sha.slice(0, 8)}`}
                      {pr.merged_at
                        ? ` · ${t.pullsMerged} ${new Date(pr.merged_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}`
                        : pr.created_at_gh
                          ? ` · ${t.pullsCreated} ${new Date(pr.created_at_gh).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}`
                          : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="notice">{t.pullsEmpty}</p>
          )
        }
      </ReadView>
    </section>
  );
}

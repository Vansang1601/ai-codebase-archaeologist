"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type AskResult, type FileDetail, type SourceLocation, type Repo } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import FileTree from "./FileTree";
import FileMap from "./FileMap";
export { default as Graph } from "./DependencyMap";
import Icon from "./Icon";
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
  return <ReadView read={read}>{(file) => <CodeReader file={file} location={location} />}</ReadView>;
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

export function Ask({ repo }: { repo: Repo }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (busy || question.trim().length < 2) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.ask(repo.id, question.trim()));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>{t.askHeading}</h2>
      <form onSubmit={ask} className="form-stack">
        <label htmlFor="question">{t.askPromptLabel}</label>
        <textarea
          id="question"
          rows={3}
          minLength={2}
          maxLength={2000}
          required
          readOnly={busy}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setResult(null);
            setError("");
          }}
          placeholder={t.askPlaceholder}
        />
        <button disabled={busy || question.trim().length < 2}>{busy ? t.btnAsking : t.btnAsk}</button>
      </form>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="result" aria-live="polite">
          <h3>{result.grounded ? t.resultGrounded : t.resultUngrounded}</h3>
          <p className="answer">{result.answer}</p>
          {result.warnings?.map((w, i) => (
            <p className="notice caution" key={i}>
              {w}
            </p>
          ))}
          {result.evidence.length > 0 && (
            <ol className="evidence-list">
              {result.evidence.map((e, i) => (
                <li key={i}>
                  <a
                    href={sourceUrl(repo, e.commit_sha, e.path, e.line_start, e.line_end)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    [E{i + 1}] {e.path} · L{e.line_start}–L{e.line_end}
                  </a>
                  <small>
                    {e.commit_sha.slice(0, 8)} · {t.scoreLabel} {e.score.toFixed(3)}
                    {e.symbol_name && " · " + e.symbol_name}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

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

  return (
    <section className="panel">
      <h2>{t.findingsHeading}</h2>
      <p className="muted">{t.findingsSubhead}</p>
      <ReadView read={read}>
        {(rows) =>
          rows.length ? (
            <ul className="findings">
              {[...rows]
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
                    <h3>{f.title}</h3>
                    <p>{f.description}</p>
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

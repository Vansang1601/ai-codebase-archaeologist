"use client";
import { useCallback, useId, useMemo, useState } from "react";
import { api, type GraphData, type Repo } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { ReadView, useRead } from "./WorkspaceUI";

const colors = ["#b8dd87", "#89d3bd", "#e6bd86", "#c3acde", "#92bde0", "#dfa69b"];
function folder(path: string) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
}
function dirColor(path: string) {
  const hash = Array.from(folder(path)).reduce((value, ch) => (value * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return colors[hash % colors.length];
}

function layout(data: GraphData, focus: string) {
  const weights = new Map<string, number>();
  for (const e of data.edges) for (const p of [e.source, e.target]) weights.set(p, (weights.get(p) || 0) + 1);
  const ranked = [...data.nodes].sort(
    (a, b) => (weights.get(b.id) || 0) - (weights.get(a.id) || 0) || a.id.localeCompare(b.id),
  );
  const center = focus || ranked[0]?.id || data.all_paths[0];
  const ids = new Set<string>(center ? [center] : []);
  for (const path of ids)
    for (const e of data.edges) {
      if (ids.size >= 20) break;
      if (e.source === path) ids.add(e.target);
      else if (e.target === path) ids.add(e.source);
    }
  for (const n of ranked) {
    if (ids.size >= 20) break;
    ids.add(n.id);
  }
  const nodes = [...ids].map((path, i) => {
    const a = i * 2.39996,
      r = Math.sqrt(i / Math.max(1, ids.size - 1));
    return { path, x: 340 + 244 * r * Math.cos(a), y: 157 + 116 * r * Math.sin(a) };
  });
  const byId = new Map(nodes.map((n) => [n.path, n]));
  const edges = data.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({ ...e, a: byId.get(e.source)!, b: byId.get(e.target)! }));
  // A fixed seed and iteration count keep the layout still as selections change.
  for (let step = 0; step < 70; step++) {
    for (const { a, b } of edges) {
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dist = Math.hypot(dx, dy) || 1,
        k = (0.014 * (dist - 105)) / dist;
      a.x += dx * k;
      a.y += dy * k;
      b.x -= dx * k;
      b.y -= dy * k;
    }
    for (let i = 0; i < nodes.length; i++)
      for (let j = 0; j < i; j++) {
        const a = nodes[i],
          b = nodes[j],
          dx = a.x - b.x,
          dy = a.y - b.y;
        const k = 155 / Math.pow(Math.max(1, Math.hypot(dx * 0.7, dy)), 2.2);
        a.x += dx * k;
        a.y += dy * k;
        b.x -= dx * k;
        b.y -= dy * k;
      }
    for (const n of nodes) {
      n.x = Math.max(48, Math.min(632, n.x));
      n.y = Math.max(25, Math.min(274, n.y));
    }
  }
  return { nodes, edges };
}

function MapView({
  repo,
  data,
  focus,
  locate,
}: {
  repo: Repo;
  data: GraphData;
  focus: string;
  locate: (p: string) => void;
}) {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const [search, setSearch] = useState(focus),
    [selected, setSelected] = useState(focus),
    [hover, setHover] = useState("");
  const impact = useRead(
    useCallback(
      () => (selected ? api.impact(repo.id, selected, 2, data.snapshot_sha) : Promise.resolve(null)),
      [repo.id, selected, data.snapshot_sha],
    ),
  );
  const select = (path: string) => {
    setSelected(path);
    setSearch(path);
  };
  const map = useMemo(() => layout(data, focus), [data, focus]);
  const result =
    impact.state.status === "ready" && impact.state.data?.target_path === selected ? impact.state.data : null;
  const depths = new Map<string, number>();
  result?.paths.forEach((p) =>
    depths.set(p.affected_path, Math.min(depths.get(p.affected_path) ?? Infinity, p.depth)),
  );
  const active = hover || selected;
  const marker = useId().replace(/:/g, "");
  return (
    <>
      <form
        className="map-search"
        onSubmit={(e) => {
          e.preventDefault();
          const path = search.trim();
          if (data.all_paths.includes(path)) {
            select(path);
            locate(path);
          }
        }}
      >
        <label htmlFor="graph-path">{vi ? "Tìm tệp trên bản đồ" : "Find a file on the map"}</label>
        <div className="line-form">
          <input
            id="graph-path"
            list="graph-paths"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={data.all_paths[0] || "src/app.py"}
          />
          <button className="quiet" disabled={!data.all_paths.includes(search.trim())}>
            {vi ? "Định vị" : "Locate"}
          </button>
        </div>
        <datalist id="graph-paths">
          {data.all_paths.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
      </form>
      <figure className="dep-figure">
        <svg
          viewBox="0 0 680 306"
          aria-label={vi ? "Bản đồ phụ thuộc tương tác" : "Interactive dependency map"}
        >
          <defs>
            {["edge", "lit"].map((kind) => (
              <marker
                key={kind}
                id={marker + kind}
                markerWidth="5"
                markerHeight="5"
                refX="4"
                refY="2.5"
                orient="auto"
              >
                <path fill={kind === "lit" ? "#ffd58d" : "#99a99c"} d="M0 0 5 2.5 0 5Z" />
              </marker>
            ))}
          </defs>
          {map.edges.map((e) => {
            const dx = e.b.x - e.a.x,
              dy = e.b.y - e.a.y,
              dist = Math.hypot(dx, dy) || 1;
            const cx = (e.a.x + e.b.x) / 2 - dy * 0.12,
              cy = (e.a.y + e.b.y) / 2 + dx * 0.12;
            const kind = active && [e.source, e.target].includes(active) ? "lit" : "edge";
            return (
              <path
                key={e.id}
                className={"dep-edge " + kind}
                markerEnd={`url(#${marker + kind})`}
                d={`M${e.a.x + (dx * 7) / dist} ${e.a.y + (dy * 7) / dist} Q${cx} ${cy} ${e.b.x - (dx * 10) / dist} ${e.b.y - (dy * 10) / dist}`}
              />
            );
          })}
          {map.nodes.map((n, i) => {
            const depth = depths.get(n.path),
              label = n.path.split("/").pop() || n.path;
            return (
              <g
                key={n.path}
                transform={`translate(${n.x} ${n.y})`}
                role="button"
                tabIndex={0}
                aria-label={n.path}
                aria-pressed={selected === n.path}
                onMouseEnter={() => setHover(n.path)}
                onMouseLeave={() => setHover("")}
                onFocus={() => setHover(n.path)}
                onBlur={() => setHover("")}
                onClick={() => select(n.path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(n.path);
                  }
                }}
              >
                <title>{n.path}</title>
                <circle r="15" fill="transparent" />
                {depth !== undefined && n.path !== selected && (
                  <circle
                    key={selected}
                    className="impact-ring"
                    r="12"
                    style={{ animationDelay: depth * 100 + "ms" }}
                  />
                )}
                {selected === n.path && <circle r="13" className="chosen-ring" />}
                <circle r={i === 0 ? 7 : 5} fill={dirColor(n.path)} />
                {(map.nodes.length <= 9 || i < 6 || n.path === active) && (
                  <text y="21" textAnchor="middle">
                    {label.length > 19 ? label.slice(0, 16) + "…" : label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <figcaption>
          <span>
            {vi ? "Đang hiển thị" : "Showing"} {map.nodes.length}/{data.all_paths.length}{" "}
            {vi ? "tệp" : "files"} · {map.edges.length} {vi ? "cạnh" : "edges"}
          </span>
          <code>{active || (vi ? "Chọn một tệp" : "Select a file")}</code>
        </figcaption>
        {map.nodes.length > 0 && (
          <div className="folder-legend">
            {Array.from(new Map(map.nodes.map((n) => [folder(n.path), dirColor(n.path)]))).map(
              ([dir, color]) => (
                <span key={dir}>
                  <i style={{ background: color }} />
                  {dir}
                </span>
              ),
            )}
          </div>
        )}
      </figure>
      {selected && (
        <ReadView read={impact}>
          {() =>
            result && (
              <div className="impact-result" role="status">
                <strong>
                  {result.affected.length} {t.impactAffectedHeading}
                </strong>
                <p>
                  <code>{selected}</code> · {vi ? "tối đa 2 bước phụ thuộc" : "up to two dependency steps"}
                </p>
                {result.affected.length > 0 && (
                  <details>
                    <summary>{vi ? "Xem các tệp bị ảnh hưởng" : "View affected files"}</summary>
                    <ul>
                      {result.affected.map((p) => (
                        <li key={p}>
                          <code>{p}</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )
          }
        </ReadView>
      )}
      {data.edges.length ? (
        <details className="edge-detail">
          <summary>
            {t.graphEdgesHeading} ({data.edges.length})
          </summary>
          <ul className="edges">
            {data.edges.map((e) => (
              <li key={e.id}>
                <code>{e.source}</code> → <code>{e.target}</code>
                <small>
                  {e.kind} · {e.evidence_type} · {e.confidence}
                </small>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="notice">{t.graphEdgesEmpty}</p>
      )}
    </>
  );
}
export default function Graph({ repo }: { repo: Repo }) {
  const { t } = useI18n();
  const [focus, setFocus] = useState("");
  const sha = repo.snapshot!.commit_sha;
  const read = useRead(useCallback(() => api.graph(repo.id, sha, focus), [repo.id, sha, focus]));
  return (
    <section className="panel">
      <h2>{t.graphHeading}</h2>
      <p className="muted">{t.graphSubhead}</p>
      <ReadView read={read}>
        {(data) => <MapView key={focus} {...{ repo, data, focus }} locate={setFocus} />}
      </ReadView>
    </section>
  );
}

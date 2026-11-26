import type { ReactNode } from "react";
import type { CodeFileInfo, SourceLocation } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import Icon from "./Icon";

type Directory = { dirs: Map<string, Directory>; files: CodeFileInfo[] };
const directory = (): Directory => ({ dirs: new Map(), files: [] });

export default function FileTree({
  files,
  active,
  cited,
  sha,
  filtering,
  open,
}: {
  files: CodeFileInfo[];
  active: string;
  cited: SourceLocation[];
  sha: string;
  filtering: boolean;
  open: (path: string) => void;
}) {
  const { t } = useI18n();
  const root = directory();
  for (const file of files) {
    let node = root;
    for (const part of file.path.split("/").slice(0, -1)) {
      if (!node.dirs.has(part)) node.dirs.set(part, directory());
      node = node.dirs.get(part)!;
    }
    node.files.push(file);
  }
  const citedPaths = new Set(cited.filter((c) => c.commit_sha === sha).map((c) => c.path));
  function branch(node: Directory, prefix: string): ReactNode {
    return (
      <>
        {[...node.dirs].map(([name, child]) => {
          const path = prefix + name + "/";
          return (
            <details
              key={path}
              open={filtering || active.startsWith(path) || undefined}
              className="tree-folder"
            >
              <summary>{name}/</summary>
              <div>{branch(child, path)}</div>
            </details>
          );
        })}
        {node.files.map((f) => (
          <button
            key={f.id}
            className={citedPaths.has(f.path) ? "file cited-file" : "file"}
            aria-label={f.path}
            title={f.path}
            aria-pressed={active === f.path}
            onClick={() => open(f.path)}
          >
            <span>
              <Icon name="file" size={15} />
              {f.path.slice(prefix.length)}
            </span>
            <small>
              {f.language} · {f.line_count} {t.linesUnit}
            </small>
          </button>
        ))}
      </>
    );
  }
  return (
    <div className="file-list">
      {files.length ? branch(root, "") : <p className="notice">{t.filesEmpty}</p>}
    </div>
  );
}

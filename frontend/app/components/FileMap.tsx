"use client";

import { useMemo, useState } from "react";
import type { CodeFileInfo } from "../../lib/api";
import { useI18n } from "../../lib/i18n";

type Rect = { x: number; y: number; w: number; h: number };
function tile(files: CodeFileInfo[], rect: Rect): (Rect & { file: CodeFileInfo })[] {
  if (!files.length) return [];
  if (files.length === 1) return [{ ...rect, file: files[0] }];
  const total = files.reduce((sum, f) => sum + f.size_bytes, 0);
  let cut = 1,
    sum = files[0].size_bytes;
  while (
    cut < files.length - 1 &&
    Math.abs(sum + files[cut].size_bytes - total / 2) < Math.abs(sum - total / 2)
  )
    sum += files[cut++].size_bytes;
  const ratio = sum / total,
    { x, y, w, h } = rect;
  const [a, b] =
    w >= h
      ? [
          { x, y, w: w * ratio, h },
          { x: x + w * ratio, y, w: w * (1 - ratio), h },
        ]
      : [
          { x, y, w, h: h * ratio },
          { x, y: y + h * ratio, w, h: h * (1 - ratio) },
        ];
  return [...tile(files.slice(0, cut), a), ...tile(files.slice(cut), b)];
}

export default function FileMap({
  files,
  active,
  open,
}: {
  files: CodeFileInfo[];
  active: string;
  open: (path: string) => void;
}) {
  const { locale } = useI18n();
  const vi = locale === "vi";
  const [hover, setHover] = useState("");
  const tiles = useMemo(
    () =>
      tile(
        files
          .filter((f) => f.size_bytes > 0)
          .sort((a, b) => b.size_bytes - a.size_bytes || a.path.localeCompare(b.path))
          .slice(0, 24),
        { x: 0, y: 0, w: 640, h: 185 },
      ),
    [files],
  );
  const current = tiles.find(({ file }) => file.path === (hover || active));
  if (!tiles.length) return null;
  return (
    <figure className="file-map">
      <figcaption>
        <strong>{vi ? "Diện tích theo dung lượng" : "Area by file size"}</strong>
        <span>
          {vi
            ? `${tiles.length} tệp lớn nhất trong kết quả`
            : `Largest ${tiles.length} files in these results`}
        </span>
      </figcaption>
      <svg viewBox="0 0 640 185" aria-label={vi ? "Bản đồ dung lượng tệp" : "File size treemap"}>
        {tiles.map(({ x, y, w, h, file }, i) => {
          const label = file.path.split("/").pop() || file.path,
            capacity = Math.floor((w - 15) / 7);
          return (
            <g
              key={file.path}
              role="button"
              tabIndex={0}
              aria-label={file.path + " · " + file.size_bytes + " B"}
              aria-pressed={active === file.path}
              onClick={() => open(file.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(file.path);
                }
              }}
              onMouseEnter={() => setHover(file.path)}
              onMouseLeave={() => setHover("")}
              onFocus={() => setHover(file.path)}
              onBlur={() => setHover("")}
            >
              <title>
                {file.path} · {file.size_bytes.toLocaleString()} B
              </title>
              <rect
                x={x + 1}
                y={y + 1}
                width={Math.max(0, w - 2)}
                height={Math.max(0, h - 2)}
                rx="2"
                fill={`color-mix(in srgb, var(--brand) ${95 - (i % 5) * 11}%, #101e18)`}
              />
              {h > 19 && capacity >= 4 && (
                <text x={x + 7} y={y + Math.min(h / 2 + 4, 20)}>
                  {label.length > capacity ? label.slice(0, capacity - 1) + "…" : label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {current && (
        <small>
          <code>{current.file.path}</code> · {current.file.size_bytes.toLocaleString()} B
        </small>
      )}
    </figure>
  );
}

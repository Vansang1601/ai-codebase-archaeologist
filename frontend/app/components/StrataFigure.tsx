"use client";

import { useId, type CSSProperties } from "react";
import { useI18n } from "../../lib/i18n";

const pipeline = [
  { en: "Clone", vi: "Sao chép", phases: ["cloning"] },
  { en: "Parse", vi: "Phân tích", phases: ["scanning", "parsing"] },
  { en: "Index", vi: "Lập chỉ mục", phases: ["indexing", "history_mapping", "pull_requests"] },
  { en: "Findings", vi: "Phát hiện", phases: ["findings"] },
];

function terrainRing(level: number) {
  const r = (22 - level) / 22;
  return Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96;
    const wobble = 1 + 0.085 * Math.cos(3 * a + r) + 0.05 * Math.sin(5 * a - r);
    const x = Math.cos(a) * r * wobble;
    const y = Math.sin(a) * r * wobble;
    return (
      (215 + 101 * x - 30 * y + 9 * (1 - r)).toFixed(2) +
      "," +
      (135 + 17 * x + 33 * y - 43 * Math.pow(1 - r, 1.35)).toFixed(2)
    );
  }).join(" ");
}

const contours = Array.from({ length: 22 }, (_, i) => terrainRing(i));

export default function StrataFigure({ expanded = false, phase }: { expanded?: boolean; phase?: string }) {
  const { locale } = useI18n();
  const vi = locale === "vi";
  const id = useId().replace(/:/g, "");
  const stage = pipeline.findIndex((layer) => layer.phases.includes(phase || ""));
  return (
    <figure
      className="strata survey"
      data-open={expanded}
      aria-label={vi ? "Mặt cắt bốn bước phân tích" : "Cross-section of the four analysis stages"}
    >
      <svg viewBox="0 0 440 285" className="terrain" aria-hidden="true">
        <defs>
          <pattern id={id + "dots"} width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".8" fill="#cbddc6" opacity=".22" />
          </pattern>
          <linearGradient id={id + "plane"} x2=".9" y2="1" gradientUnits="objectBoundingBox">
            <stop stopColor="var(--brand-light)" />
            <stop offset="1" stopColor="var(--brand)" />
          </linearGradient>
        </defs>
        <rect width="440" height="285" fill={`url(#${id}dots)`} />
        <g className="survey-ticks" fill="none" stroke="currentColor" strokeWidth=".8">
          <path d="M18 28v-9h9m386 0h9v9m0 230v9h-9M27 267h-9v-9" />
          {Array.from({ length: 13 }, (_, i) => (
            <path key={i} d={`M20 ${54 + i * 15}h${i % 3 === 0 ? 8 : 4}`} />
          ))}
          <path d="m70 199 145 63 155-60M73 192v13m295-10v13" strokeDasharray="3 4" />
        </g>
        {pipeline.map((_, i) => {
          const y = (3 - i) * 13;
          const style = { "--lift": (1.5 - i) * 13 + "px" } as CSSProperties;
          return (
            <g key={i} className="soil-layer" style={style} data-current={stage === i}>
              <g transform={`translate(0 ${y})`}>
                <path
                  d="m62 139 153-61 163 63-157 70Z"
                  fill={i === 3 ? `url(#${id}plane)` : "var(--brand)"}
                  stroke="var(--brand-light)"
                  strokeWidth=".9"
                />
                <path d="m62 139 159 72v7L62 146Z" fill="var(--brand)" />
                <path d="m221 211 157-70v7l-157 70Z" fill="color-mix(in srgb, var(--brand) 55%, #0b150e)" />
                <path d="m62 146 159 72 157-70" stroke="var(--brand-light)" opacity=".45" fill="none" />
                {i === 3 && (
                  <>
                    {contours.map((points, n) => (
                      <polygon
                        key={n}
                        points={points}
                        fill="color-mix(in srgb, var(--brand) 76%, #253a25)"
                        stroke="var(--brand-light)"
                        strokeWidth=".86"
                      />
                    ))}
                    <path d="M224 96V67" stroke="#ffcf83" strokeDasharray="2 3" />
                    <path d="m224 54 6 8-6 8-6-8Z" fill="#ffb547" />
                    <path d="m224 54 0 16-6-8Z" fill="#ffdc99" />
                  </>
                )}
                {stage === i && (
                  <path d="m62 139 159 72 157-70" stroke="#ffd285" strokeWidth="2.8" fill="none" />
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span>{vi ? "Mặt cắt kho mã" : "Repository cross-section"}</span>
        <ol>
          {pipeline.map((item, i) => (
            <li key={item.en} aria-current={stage === i ? "step" : undefined}>
              <span className="stratum-key" style={{ opacity: 0.4 + i * 0.19 }} />
              {item[locale]}
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}

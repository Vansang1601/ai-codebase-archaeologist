"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import Icon from "./components/Icon";
import StrataFigure from "./components/StrataFigure";
import { messageOf } from "./components/WorkspaceUI";

export default function HomeHero() {
  const { t, locale } = useI18n();
  const vi = locale === "vi";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    setError("");
    setCreatedId("");
    setBusy(true);
    try {
      const repo = await api.createRepo(url.trim());
      setCreatedId(repo.id);
      const job = await api.sync(repo.id);
      router.push("/repos/" + repo.id + "?job=" + encodeURIComponent(job.id));
    } catch (err) {
      setError(messageOf(err, locale));
      setBusy(false);
    }
  }

  const steps = [
    {
      num: "01",
      icon: "repository" as const,
      title: vi ? "Nạp kho mã GitHub" : "Ingest Repository",
      desc: vi
        ? "Dán đường dẫn kho mã công khai hoặc chọn ví dụ có sẵn."
        : "Paste any public repository URL or pick a standard testbed.",
    },
    {
      num: "02",
      icon: "layers" as const,
      title: vi ? "Bóc tách AST & Lập chỉ mục" : "AST & Git Archaeology",
      desc: vi
        ? "Chốt commit SHA, parse cú pháp hàm/lớp và dựng đồ thị phụ thuộc."
        : "Pin immutable commit SHA, parse AST symbols, and map imports.",
    },
    {
      num: "03",
      icon: "sparkles" as const,
      title: vi ? "AI Soi Mã Nguồn Chuyên Sâu" : "AI Deep Code Inspection",
      desc: vi
        ? "Giám định kiến trúc, bảo mật, nợ kỹ thuật với trích dẫn bằng chứng."
        : "Audit architecture, vulnerabilities, and blast radius with verified citations.",
    },
    {
      num: "04",
      icon: "audit" as const,
      title: vi ? "Thẩm tra & Tái cấu trúc" : "Evidence-Backed Refactor",
      desc: vi
        ? "Mở đúng dòng mã, xem trước bản sửa và xuất patch đã duyệt."
        : "Jump to highlighted lines, preview a fix and export a reviewed patch.",
    },
  ];

  return (
    <>
      <section id="analyze" className="hero-band">
        <div className="wrap hero-layout">
          <div className="hero-copy">
            <div className="hero-badge">
              <Icon name="sparkles" size={14} />
              <span>{vi ? "NỀN TẢNG AI GIÁM ĐỊNH MÃ NGUỒN" : "EVIDENCE-FIRST CODE ARCHAEOLOGIST"}</span>
            </div>
            <h1>
              {vi
                ? "Đoạn mã này đến từ đâu? Sửa nó sẽ ảnh hưởng đến đâu?"
                : "Where did this code come from? What changes if you edit it?"}
            </h1>
            <p>
              {vi
                ? "Soi mã nguồn chuyên sâu bằng AI: lần theo cây cú pháp AST, phụ thuộc và bằng chứng tĩnh đến từng dòng mã trong repo GitHub."
                : "Deep AI codebase inspection: trace AST syntax, dependencies, and immutable evidence down to the exact line of code."}
            </p>

            <form onSubmit={analyze} className="import-form">
              <label htmlFor="repo-url" className="sr-only">
                {t.inputLabel}
              </label>
              <div className="url-field">
                <Icon name="github" size={19} />
                <input
                  ref={inputRef}
                  id="repo-url"
                  type="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={1000}
                  placeholder="https://github.com/owner/repo"
                  value={url}
                  readOnly={busy}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                    setCreatedId("");
                  }}
                />
              </div>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? t.btnAnalyzing : (vi ? "Bắt đầu soi code" : t.btnAnalyze)}
                {busy ? <span className="spinner" /> : <Icon name="arrow" size={16} />}
              </button>
            </form>

            <div className="samples">
              <span>{vi ? "Thử ngay với" : "Try with"}</span>
              {["pallets/click", "pallets/flask"].map((sample) => (
                <button
                  type="button"
                  key={sample}
                  disabled={busy}
                  onClick={() => {
                    setUrl("https://github.com/" + sample);
                    setError("");
                    setCreatedId("");
                    inputRef.current?.focus();
                  }}
                >
                  {sample}
                  <Icon name="upRight" size={11} />
                </button>
              ))}
            </div>

            {error && (
              <div className="notice error" role="alert">
                {error} {createdId && <Link href={"/repos/" + createdId}>{t.openToRetry}</Link>}
              </div>
            )}
          </div>
          <StrataFigure expanded={busy} phase={busy ? "queued" : undefined} />
        </div>
      </section>

      {/* 4-Step Visual Inspection Process Banner */}
      <section className="workflow-band">
        <div className="wrap">
          <div className="workflow-header">
            <span className="workflow-sub">
              <Icon name="compass" size={14} />
              {vi ? "QUY TRÌNH XỬ LÝ 4 BƯỚC" : "4-STEP ARCHAEOLOGY WORKFLOW"}
            </span>
            <h2>{vi ? "Cách Thức Hoạt Động Của Hệ Thống" : "How Codebase Archaeology Works"}</h2>
            <p className="muted">
              {vi
                ? "Từ kho mã đến dẫn chứng, phân tích và bản sửa có thể kiểm tra qua 4 giai đoạn."
                : "From repository to source evidence, analysis and reviewable edits in four stages."}
            </p>
          </div>

          <div className="workflow-grid">
            {steps.map((s) => (
              <div key={s.num} className="workflow-card">
                <div className="workflow-card-top">
                  <span className="workflow-num">{s.num}</span>
                  <span className="workflow-icon">
                    <Icon name={s.icon} size={20} />
                  </span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import AboutOverview from "./about/AboutOverview";
import Icon from "./components/Icon";
import StrataFigure from "./components/StrataFigure";
import { messageOf } from "./components/WorkspaceUI";

export default function HomePage() {
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

  return (
    <>
      <section id="analyze" className="hero-band">
        <div className="wrap hero-layout">
          <div className="hero-copy">
            <div className="eyebrow"><Icon name="compass" size={15}/>{vi ? "Phân tích kho mã" : "Repository analysis"}</div>
            <h1>{vi ? "Khám phá" : "Explore your"}<br/><em>{vi ? "mã nguồn." : "codebase."}</em></h1>
            <p>{t.heroSubhead}</p>
            <form onSubmit={analyze} className="import-form">
              <label htmlFor="repo-url" className="sr-only">{t.inputLabel}</label>
              <div className="url-field"><Icon name="github" size={19}/>
                <input ref={inputRef} id="repo-url" type="url" autoCapitalize="none" spellCheck={false} required maxLength={1000}
                  placeholder="https://github.com/owner/repo" value={url} readOnly={busy}
                  onChange={e => { setUrl(e.target.value); setError(""); setCreatedId(""); }} />
              </div>
              <button className="primary" type="submit" disabled={busy}>{busy ? t.btnAnalyzing : t.btnAnalyze}{busy ? <span className="spinner"/> : <Icon name="arrow" size={16}/>}</button>
            </form>
            <div className="samples"><span>{vi ? "Thử với" : "Try with"}</span>
              {["pallets/click", "pallets/flask"].map(sample => <button type="button" key={sample} disabled={busy} onClick={() => {
                setUrl("https://github.com/" + sample); setError(""); setCreatedId(""); inputRef.current?.focus();
              }}>{sample}<Icon name="upRight" size={11}/></button>)}
            </div>
            {error && <div className="notice error" role="alert">{error} {createdId && <Link href={"/repos/" + createdId}>{t.openToRetry}</Link>}</div>}
          </div>
          <StrataFigure/>
        </div>
      </section>
      <AboutOverview/>
    </>
  );
}

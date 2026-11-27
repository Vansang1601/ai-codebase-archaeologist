"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type AskResult, type SourceLocation, type Repo } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { messageOf } from "./WorkspaceUI";

function sourceUrl(repo: Repo, sha: string, path: string, start?: number | null, end?: number | null) {
  const file = path.split("/").map(encodeURIComponent).join("/");
  const lines = start ? "#L" + start + (end && end > start ? "-L" + end : "") : "";
  return "https://github.com/" + encodeURIComponent(repo.owner) + "/" + encodeURIComponent(repo.name) + "/blob/" + encodeURIComponent(sha) + "/" + file + lines;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: AskResult;
  timestamp: string;
};

interface FloatingChatProps {
  /** Repository the chat answers about; null when none is available yet. */
  repo: Repo | null;
  /** Other repositories the user can switch to (empty on a results page). */
  repos?: Repo[];
  signedIn?: boolean;
  onSelectRepo?: (id: string) => void;
  isOpen: boolean;
  onOpenSource: (source:SourceLocation)=>void;
  onCitations: (sources:SourceLocation[])=>void;
  onToggle: (open: boolean) => void;
}

export default function FloatingChat({ repo, repos = [], signedIn = false, onSelectRepo, isOpen, onToggle, onOpenSource, onCitations }: FloatingChatProps) {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  // Conversations are kept per repository so they survive moving between pages.
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const threadKey = repo?.id ?? "";
  const messages = threads[threadKey] ?? [];
  function addMessage(key: string, message: Message) {
    setThreads(prev => ({ ...prev, [key]: [...(prev[key] ?? []), message] }));
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const isVi = locale === "vi";
  const shortSha = repo?.snapshot?.commit_sha ? repo.snapshot.commit_sha.slice(0, 7) : "";
  const ready = !!repo?.snapshot;

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onToggle(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onToggle]);

  async function handleSend(qText?: string) {
    const textToSend = (qText || question).trim();
    if (!repo || !ready || busy || textToSend.length < 2) return;
    const target = repo;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    addMessage(target.id, userMsg);
    setQuestion("");
    setBusy(true);
    setError("");

    try {
      const res = await api.ask(target.id, textToSend, history);
      onCitations(res.evidence);
      const assistantMsg: Message = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: res.answer,
        result: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      addMessage(target.id, assistantMsg);
    } catch (err) {
      setError(messageOf(err, locale));
      setQuestion(textToSend);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  }

  const quickPrompts = isVi
    ? [
        "🏛️ Kiến trúc tổng thể và các module chính?",
        "🛡️ Luồng xác thực và an ninh dữ liệu?",
        "⚡ Những hàm có nguy cơ ảnh hưởng lớn khi sửa?",
        "🧹 Phát hiện điểm nghẽn nợ kỹ thuật cần tối ưu?",
      ]
    : [
        "🏛️ What is the overall architecture and data flow?",
        "🛡️ How are authentication and security handled?",
        "⚡ Which modules have the largest blast radius?",
        "🧹 What are the main technical debt hotspots?",
      ];

  return (
    <div className="floating-chat-container">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="floating-chat-trigger"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-label={isVi ? "Mở công cụ soi mã nguồn AI" : "Open AI Code Inspector"}
          title={isVi ? "AI Soi Mã Nguồn & Giám Định" : "AI Code Inspector"}
          onClick={() => onToggle(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
          </svg>
          <span className="trigger-label">{isVi ? "Soi Code AI" : "AI Inspect"}</span>
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="floating-chat-box" role="dialog" aria-modal="false" aria-label={isVi ? "AI Giám định mã nguồn" : "AI Code Inspector"}>
          {/* Header */}
          <div className="chat-box-header">
            <div className="chat-header-title">
              <span className="chat-status-dot" aria-hidden="true" />
              <strong>{isVi ? "AI Code Inspector" : "AI Code Inspector"}</strong>
              {shortSha && <span className="chat-sha-badge">SHA: {shortSha}</span>}
            </div>
            <div className="chat-header-actions">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="chat-icon-btn"
                  disabled={busy} onClick={() => { setThreads(prev => ({ ...prev, [threadKey]: [] })); onCitations([]); setError(""); }}
                  title={isVi ? "Xoá đoạn hội thoại" : "Clear conversation"}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => onToggle(false)}
                title={isVi ? "Thu nhỏ chatbox" : "Minimize chat"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {repo && (
            <div className="chat-repo-bar">
              {repos.length > 1 ? (
                <select
                  aria-label={isVi ? "Chọn kho mã để hỏi đáp" : "Choose a repository to ask about"}
                  value={repo.id}
                  onChange={(e) => { setError(""); onSelectRepo?.(e.target.value); }}
                  disabled={busy}
                >
                  {repos.map(r => <option key={r.id} value={r.id}>{r.owner} / {r.name}</option>)}
                </select>
              ) : (
                <span className="chat-repo-name">{repo.owner} / {repo.name}</span>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="chat-box-body" ref={scrollRef} role="log" aria-live="polite">
            {!ready && (
              <div className="chat-welcome">
                <h3>{isVi ? "Chưa có kho mã để hỏi đáp" : "No repository to ask about yet"}</h3>
                <p>{isVi
                  ? "Hãy phân tích một kho GitHub ở Trang chủ, sau đó quay lại đây để hỏi về tệp, hàm và lịch sử thay đổi."
                  : "Analyze a GitHub repository from the home page, then come back here to ask about its files, functions and history."}</p>
                {!signedIn && <p>{isVi ? "Đăng nhập để chọn lại các kho đã phân tích trước đó." : "Sign in to pick from repositories you analyzed before."}</p>}
                <Link className="text-action" href="/#analyze" onClick={() => onToggle(false)}>{isVi ? "Phân tích một kho mã" : "Analyze a repository"}</Link>
              </div>
            )}
            {ready && messages.length === 0 && (
              <div className="chat-welcome">
                <h3>{isVi ? "Bạn muốn tìm hiểu phần nào?" : "What would you like to trace?"}</h3>
                <p>{isVi ? "Hỏi về tệp hoặc hàm trong phiên bản này. Mở trích dẫn để đọc các dòng mã liên quan." : "Ask about a file or function in this snapshot. Open a citation to read the relevant lines."}</p>
                <div className="quick-prompts">
                  <small>{isVi ? "Gợi ý câu hỏi nhanh:" : "Suggested questions:"}</small>
                  <div className="prompts-list">
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="prompt-chip"
                        onClick={() => void handleSend(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`chat-message ${m.role}`}>
                <div className="message-content">
                  {m.role === "user" ? (
                    <div className="user-bubble">{m.content}</div>
                  ) : (
                    <div className="assistant-bubble">
                      {m.result && (
                        <div className={`grounded-badge ${m.result.grounded ? "grounded" : "ungrounded"}`}>
                          <span className="dot" />
                          <span>{m.result.grounded ? (isVi ? "Đã đối chiếu mã nguồn" : "Grounded Evidence") : (isVi ? "Thiếu bằng chứng tin cậy" : "Insufficient Evidence")}</span>
                        </div>
                      )}
                      <div className="answer-text">{m.content}</div>

                      {m.result?.warnings && m.result.warnings.length > 0 && (
                        <div className="chat-warnings">
                          {m.result.warnings.map((w, idx) => (
                            <div key={idx} className="warning-item">
                              ⚠ {w}
                            </div>
                          ))}
                        </div>
                      )}

                      {m.result?.evidence && m.result.evidence.length > 0 && (
                        <div className="chat-evidence">
                          <span className="evidence-title">
                            {isVi ? "Dẫn chứng trích dẫn (" + m.result.evidence.length + "):" : "Evidence sources (" + m.result.evidence.length + "):"}
                          </span>
                          <div className="evidence-chips">
                            {m.result.evidence.map((ev, idx) => (
                              <div key={idx} className="citation-row">
                                <button className="evidence-chip" onClick={()=>onOpenSource(ev)} title={isVi ? "Mở dòng mã được trích dẫn" : "Open cited source lines"}>
                                  <span className="ev-idx">[E{idx+1}]</span><span className="ev-path">{ev.path}</span>
                                  <span className="ev-lines">L{ev.line_start}–{ev.line_end}</span>
                                  <span className="ev-score">{ev.commit_sha.slice(0,7)} · {t.scoreLabel} {ev.score.toFixed(2)}</span>
                                </button>
                                <a href={repo ? sourceUrl(repo,ev.commit_sha,ev.path,ev.line_start,ev.line_end) : undefined} target="_blank" rel="noreferrer" aria-label={"GitHub · "+ev.path}>GitHub ↗</a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="message-time">{m.timestamp}</span>
                </div>
              </div>
            ))}

            {busy && (
              <div className="chat-message assistant">
                <div className="assistant-bubble loading">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="loading-label">
                    {isVi ? "Đang truy xuất mã nguồn & trích dẫn..." : "Retrieving grounded evidence..."}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error-notice" role="alert">
                <span>{error}</span>
                <button type="button" aria-label={isVi ? "Đóng thông báo" : "Dismiss error"} onClick={() => setError("")}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Footer / Input */}
          <form onSubmit={onSubmit} className="chat-box-footer">
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                aria-label={t.askPromptLabel}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isVi ? "Đặt câu hỏi về codebase (Enter để gửi)..." : "Ask about this codebase (Enter to send)..."}
                rows={1}
                maxLength={2000}
                readOnly={busy || !ready}
                disabled={!ready}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={busy || !ready || question.trim().length < 2}
                aria-label={isVi ? "Gửi câu hỏi" : "Send question"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

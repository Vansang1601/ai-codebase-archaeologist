"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type AskResult, type Repo } from "../../lib/api";
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
  repo: Repo;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function FloatingChat({ repo, isOpen, onToggle }: FloatingChatProps) {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const isVi = locale === "vi";
  const shortSha = repo.snapshot?.commit_sha ? repo.snapshot.commit_sha.slice(0, 7) : "";

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
    if (busy || textToSend.length < 2) return;

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

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setBusy(true);
    setError("");

    try {
      const res = await api.ask(repo.id, textToSend, history);
      const assistantMsg: Message = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: res.answer,
        result: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
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
        "Kiến trúc tổng thể và module chính?",
        "Điểm bắt đầu của ứng dụng ở đâu?",
        "Xử lý xác thực người dùng thế nào?",
      ]
    : [
        "What is the overall architecture?",
        "Where is the application entrypoint?",
        "How is authentication handled?",
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
          aria-label={isVi ? "Mở hỏi đáp mã nguồn" : "Open codebase chat"}
          title={isVi ? "Hỏi đáp mã nguồn" : "Ask about this codebase"}
          onClick={() => onToggle(true)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3.5c-5.1 0-8.8 3.4-8.8 8 0 2 .7 3.8 2 5.1l-.8 4.1 4.3-1.8c1 .4 2.1.6 3.3.6 5 0 8.8-3.4 8.8-8s-3.8-8-8.8-8Z"
              stroke="currentColor" strokeWidth="1.85" strokeLinejoin="round"/>
            <g fill="currentColor">
              <circle cx="8" cy="11.6" r="1.1"/><circle cx="12" cy="11.6" r="1.1"/><circle cx="16" cy="11.6" r="1.1"/>
            </g>
          </svg>
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="floating-chat-box" role="dialog" aria-modal="false" aria-label={isVi ? "Hỏi đáp mã nguồn" : "Codebase Q&A"}>
          {/* Header */}
          <div className="chat-box-header">
            <div className="chat-header-title">
              <span className="chat-status-dot" aria-hidden="true" />
              <strong>{isVi ? "Hỏi đáp mã nguồn" : "Codebase Q&A"}</strong>
              {shortSha && <span className="chat-sha-badge">SHA: {shortSha}</span>}
            </div>
            <div className="chat-header-actions">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="chat-icon-btn"
                  disabled={busy} onClick={() => { setMessages([]); setError(""); }}
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

          {/* Messages Stream */}
          <div className="chat-box-body" ref={scrollRef} role="log" aria-live="polite">
            {messages.length === 0 && (
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
                              <a
                                key={idx}
                                href={sourceUrl(repo, ev.commit_sha, ev.path, ev.line_start, ev.line_end)}
                                target="_blank"
                                rel="noreferrer"
                                className="evidence-chip"
                                title={`Score: ${ev.score.toFixed(3)} | Symbol: ${ev.symbol_name || "module"}`}
                              >
                                <span className="ev-idx">[E{idx + 1}]</span>
                                <span className="ev-path">{ev.path.split("/").pop()}</span>
                                <span className="ev-lines">L{ev.line_start}-{ev.line_end}</span>
                                <span className="ev-score">{t.scoreLabel} {ev.score.toFixed(2)}</span>
                              </a>
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
                readOnly={busy}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={busy || question.trim().length < 2}
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

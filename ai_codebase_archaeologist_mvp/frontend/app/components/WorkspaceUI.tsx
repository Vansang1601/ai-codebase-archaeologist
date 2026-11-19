"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";

export function messageOf(error: unknown) {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return "Cannot connect to backend API. Please verify backend service is running.";
  }
  return error instanceof Error ? error.message : "Failed to load data. Please retry.";
}

type ReadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export function useRead<T>(load: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ReadState<T>>({ status: "loading" });
  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    load().then(
      data => { if (current) setState({ status: "ready", data }); },
      error => { if (current) setState({ status: "error", message: messageOf(error) }); }
    );
    return () => { current = false; };
  }, [load, version]);
  return { state, retry: () => setVersion(v => v + 1) };
}

export function ReadView<T>({ read, children }: {
  read: ReturnType<typeof useRead<T>>;
  children: (data: T) => ReactNode;
}) {
  const { locale } = useI18n();
  const retryLabel = locale === "vi" ? "Thử lại" : "Retry";
  const loadingLabel = locale === "vi" ? "Đang tải dữ liệu…" : "Loading data…";

  if (read.state.status === "error") {
    return (
      <div className="notice error" role="alert">
        {read.state.message}{" "}
        <button className="text-action" onClick={read.retry}>
          {retryLabel}
        </button>
      </div>
    );
  }
  if (read.state.status === "loading") {
    return (
      <p className="notice" role="status">
        {loadingLabel}
      </p>
    );
  }
  return <>{children(read.state.data)}</>;
}

export function Status({ value }: { value: string }) {
  const { t } = useI18n();
  const label = (t.status as Record<string, string>)[value] || value;
  return <span className={"status " + value}>{label}</span>;
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

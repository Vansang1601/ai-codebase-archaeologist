"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon from "./Icon";
import { useI18n } from "../../lib/i18n";

export function messageOf(error: unknown, locale: "en" | "vi" = "en") {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return locale === "vi" ? "Chưa kết nối được máy chủ. Kiểm tra backend rồi thử lại." : "Could not reach the server. Check that the backend is running and try again.";
  }
  return error instanceof Error ? error.message : locale === "vi" ? "Không tải được dữ liệu. Vui lòng thử lại." : "Could not load data. Please try again.";
}

type ReadState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: T };

export function useRead<T>(load: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ReadState<T>>({ status: "loading" });
  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    load().then(
      data => { if (current) setState({ status: "ready", data }); },
      error => { if (current) setState({ status: "error", error }); }
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
        {messageOf(read.state.error, locale)}{" "}
        <button className="text-action" onClick={read.retry}>
          {retryLabel}
        </button>
      </div>
    );
  }
  if (read.state.status === "loading") {
    return (
      <p className="notice" role="status">
        <span className="spinner" aria-hidden="true"/> {loadingLabel}
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
      <Icon name="layers" size={23} />
    </span>
  );
}

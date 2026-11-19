"use client";

import { useEffect, useState, type ReactNode } from "react";

export function messageOf(error: unknown) {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return "Chưa kết nối được API. Kiểm tra backend đang chạy rồi thử lại.";
  }
  return error instanceof Error ? error.message : "Không tải được dữ liệu. Vui lòng thử lại.";
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
  if (read.state.status === "error") {
    return <div className="notice error" role="alert">{read.state.message} <button className="text-action" onClick={read.retry}>Thử lại</button></div>;
  }
  if (read.state.status === "loading") return <p className="notice" role="status">Đang tải dữ liệu…</p>;
  return <>{children(read.state.data)}</>;
}

const labels: Record<string, string> = {
  registered: "Đã thêm", queued: "Đang chờ", running: "Đang phân tích",
  ready: "Sẵn sàng", completed: "Hoàn tất", failed: "Thất bại",
  high: "Mức cao", medium: "Mức vừa", info: "Thông tin"
};

export function Status({ value }: { value: string }) {
  return <span className={'status ' + value}>{labels[value] || value}</span>;
}

export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>;
}

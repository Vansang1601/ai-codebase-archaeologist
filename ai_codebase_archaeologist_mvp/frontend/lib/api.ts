const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type Snapshot = {
  id: string;
  commit_sha: string;
  branch?: string | null;
  file_count: number;
  symbol_count: number;
  dependency_count: number;
  chunk_count: number;
};

export type Repo = {
  id: string;
  owner: string;
  name: string;
  canonical_url: string;
  status: string;
  snapshot?: Snapshot | null;
};

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)session_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return localStorage.getItem("session_token");
}

export function setToken(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `session_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem("session_token", token);
  } else {
    document.cookie = "session_token=; path=/; max-age=0";
    localStorage.removeItem("session_token");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> || {})
  };
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const body = await res.json(); message = body.detail || message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  repos: () => request<Repo[]>("/api/repos"),
  createRepo: (url: string) => request<Repo>("/api/repos", {method:"POST", body:JSON.stringify({url})}),
  repo: (id: string) => request<Repo>(`/api/repos/${id}`),
  sync: (id: string) => request<any>(`/api/repos/${id}/sync`, {method:"POST", body:JSON.stringify({ref:null})}),
  job: (id: string) => request<any>(`/api/jobs/${id}`),
  files: (id: string) => request<any[]>(`/api/repos/${id}/files?limit=1000`),
  file: (id: string, path: string) => request<any>(`/api/repos/${id}/file?path=${encodeURIComponent(path)}`),
  ask: (id: string, question: string) => request<any>(`/api/repos/${id}/questions`, {method:"POST", body:JSON.stringify({question, top_k:5})}),
  timeline: (id: string) => request<any[]>(`/api/repos/${id}/timeline?limit=100`),
  graph: (id: string) => request<any>(`/api/repos/${id}/graph?limit=1000`),
  impact: (id: string, target_path: string, depth=2) => request<any>(`/api/repos/${id}/impact`, {method:"POST", body:JSON.stringify({target_path, depth})}),
  findings: (id: string) => request<any[]>(`/api/repos/${id}/findings`),
  authStatus: () => request<any>("/api/auth/status"),
  login: (email: string) => request<any>("/api/auth/login", {method:"POST", body:JSON.stringify({email})}),
  register: (email: string, name?: string) => request<any>("/api/auth/register", {method:"POST", body:JSON.stringify({email, name})}),
  me: () => request<any>("/api/auth/me"),
  githubInstallations: () => request<any>("/api/auth/github/installations"),
  githubRepos: () => request<any>("/api/auth/github/repositories"),
};

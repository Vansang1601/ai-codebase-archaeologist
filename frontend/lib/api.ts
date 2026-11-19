const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface Snapshot {
  id: string;
  commit_sha: string;
  branch?: string | null;
  status?: string;
  file_count: number;
  symbol_count: number;
  dependency_count: number;
  chunk_count: number;
  created_at?: string;
}

export interface Repo {
  id: string;
  owner: string;
  name: string;
  canonical_url: string;
  status: string;
  snapshot?: Snapshot | null;
}

export interface JobInfo {
  id: string;
  repository_id: string;
  requested_ref?: string | null;
  status: "queued" | "running" | "completed" | "failed";
  phase: string;
  progress: number;
  snapshot_id?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeFileInfo {
  id: string;
  path: string;
  language: string;
  size_bytes: number;
  line_count: number;
  content_hash: string;
}

export interface FileDetail {
  path: string;
  language: string;
  content: string;
  line_count: number;
  commit_sha: string;
}

export interface EvidenceItem {
  path: string;
  line_start: number;
  line_end: number;
  commit_sha: string;
  github_url: string;
  score: number;
  symbol_name?: string | null;
}

export interface AskResult {
  answer: string;
  grounded: boolean;
  evidence: EvidenceItem[];
  warnings?: string[];
}

export interface TimelineCommit {
  sha: string;
  short_sha: string;
  author_name: string;
  message: string;
  committed_at: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  evidence_type: string;
  confidence: number;
}

export interface GraphData {
  snapshot_sha: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImpactResult {
  target_path: string;
  max_depth: number;
  affected: string[];
  paths: Array<{
    affected_path: string;
    depth: number;
    path: string[];
  }>;
}

export interface FindingItem {
  id: string;
  kind: string;
  severity: "info" | "medium" | "high";
  title: string;
  description: string;
  evidence_path?: string | null;
  line_start?: number | null;
  line_end?: number | null;
  meta: Record<string, any>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  repos: () => request<Repo[]>("/api/repos"),

  createRepo: (url: string) =>
    request<Repo>("/api/repos", {
      method: "POST",
      body: JSON.stringify({ url })
    }),

  repo: (id: string) => request<Repo>(`/api/repos/${id}`),

  sync: (id: string) =>
    request<JobInfo>(`/api/repos/${id}/sync`, {
      method: "POST",
      body: JSON.stringify({ ref: null })
    }),

  job: (id: string) => request<JobInfo>(`/api/jobs/${id}`),

  files: (id: string) => request<CodeFileInfo[]>(`/api/repos/${id}/files?limit=1000`),

  file: (id: string, path: string) =>
    request<FileDetail>(`/api/repos/${id}/file?path=${encodeURIComponent(path)}`),

  ask: (id: string, question: string) =>
    request<AskResult>(`/api/repos/${id}/questions`, {
      method: "POST",
      body: JSON.stringify({ question, top_k: 5 })
    }),

  timeline: (id: string) => request<TimelineCommit[]>(`/api/repos/${id}/timeline?limit=100`),

  graph: (id: string) => request<GraphData>(`/api/repos/${id}/graph?limit=1000`),

  impact: (id: string, target_path: string, depth = 2) =>
    request<ImpactResult>(`/api/repos/${id}/impact`, {
      method: "POST",
      body: JSON.stringify({ target_path, depth })
    }),

  findings: (id: string) => request<FindingItem[]>(`/api/repos/${id}/findings`),

  authStatus: () => request<{ enabled: boolean; client_id: string | null }>("/api/auth/status"),

  authLoginUrl: `${API}/api/auth/login`,
};

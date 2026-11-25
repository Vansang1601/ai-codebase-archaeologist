const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )session_token=([^;]+)"));
  return match ? match[2] : null;
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    // Secure session cookie - strictly not stored in localStorage
    document.cookie = `session_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = "session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

export interface Snapshot {
  id: string;
  commit_sha: string;
  branch?: string | null;
  status?: string;
  file_count: number;
  symbol_count: number;
  dependency_count: number;
  chunk_count: number;
  pr_count?: number;
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
  pr_status?: string | null;
  pr_count?: number;
  skipped_files_json?: string | null;
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

export interface UserAccount {
  provider: string;
  provider_account_id: string;
  created_at?: string | null;
}

export interface UserProfile {
  user_id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  preferred_locale?: string;
  created_at?: string | null;
  tenant_id?: string | null;
  workspace_name?: string | null;
  role?: string;
  accounts?: UserAccount[];
  github_installations_count?: number;
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

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  author_name: string;
  head_sha?: string | null;
  base_branch?: string | null;
  merged_at?: string | null;
  closed_at?: string | null;
  created_at_gh?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  pulls: (id: string) => request<PullRequest[]>(`/api/repos/${id}/pulls`),

  authStatus: () => request<{
    auth_configured?: boolean;
    github_oauth_configured?: boolean;
    google_oauth_configured?: boolean;
    github_app_configured?: boolean;
    enabled?: boolean;
    allow_dev_login?: boolean;
    message?: string;
  }>("/api/auth/status"),

  oauthUrl: (provider: "github" | "google") => request<{ url: string }>(`/api/auth/oauth/${provider}/url`),

  authLoginUrl: `${API}/api/auth/oauth/github/url`,

  login: (email: string) =>
    request<{ access_token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email })
    }),

  register: (email: string, name?: string) =>
    request<{ access_token: string; user: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name })
    }),

  me: () => request<UserProfile>("/api/auth/me"),

  updateProfile: (data: { name?: string; preferred_locale?: string }) =>
    request<{ status: string; user_id: string; name?: string; preferred_locale?: string }>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<any>("/api/auth/logout", {
      method: "POST"
    }),
};

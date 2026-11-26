"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { api, getToken, type Repo, type SourceLocation } from "../../lib/api";
import FloatingChat from "./FloatingChat";

// A results page registers itself here so the shared chat can drive its explorer.
type Workspace = {
  repo: Repo;
  onOpenSource: (source: SourceLocation) => void;
  onCitations: (sources: SourceLocation[]) => void;
};
// Set when the chat is used away from a results page and a citation is opened.
type Pending = { repoId: string; source: SourceLocation; cited: SourceLocation[] };

type ChatContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
  pending: Pending | null;
  setPending: (pending: Pending | null) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside ChatProvider");
  return value;
}

const REPO_KEY = "chat_repo";

function readStoredRepo() {
  try { return localStorage.getItem(REPO_KEY) || ""; } catch { return ""; }
}

function GlobalChat() {
  const { open, setOpen, workspace, setPending } = useChat();
  const router = useRouter();
  const path = usePathname();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [remembered, setRemembered] = useState<Repo | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const cited = useRef<SourceLocation[]>([]);
  const workspaceId = workspace?.repo.id;

  // Outside a results page, offer the user's own repositories (and the last one they viewed).
  useEffect(() => {
    if (!open || workspaceId) return;
    let current = true;
    const token = !!getToken();
    const last = readStoredRepo();
    setSelectedId(last);
    setSignedIn(token);
    if (token) api.repos().then(rows => { if (current) setRepos(rows); }, () => { if (current) setRepos([]); });
    else setRepos([]);
    if (last) api.repo(last).then(row => { if (current) setRemembered(row); }, () => { if (current) setRemembered(null); });
    else setRemembered(null);
    return () => { current = false; };
  }, [open, workspaceId, path]);

  const candidates = useMemo(() => {
    const rows = repos.filter(r => r.snapshot);
    if (remembered?.snapshot && !rows.some(r => r.id === remembered.id)) rows.unshift(remembered);
    return rows;
  }, [repos, remembered]);

  const repo = workspace?.repo ?? candidates.find(r => r.id === selectedId) ?? candidates[0] ?? null;

  useEffect(() => {
    if (!repo) return;
    try { localStorage.setItem(REPO_KEY, repo.id); } catch {}
  }, [repo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCitations = useCallback((sources: SourceLocation[]) => {
    if (workspace) workspace.onCitations(sources);
    else cited.current = sources;
  }, [workspace]);

  const onOpenSource = useCallback((source: SourceLocation) => {
    if (workspace) return workspace.onOpenSource(source);
    if (!repo) return;
    setPending({ repoId: repo.id, source, cited: cited.current });
    setOpen(false);
    router.push("/repos/" + repo.id);
  }, [workspace, repo, router, setOpen, setPending]);

  return <FloatingChat
    repo={repo}
    repos={workspace ? [] : candidates}
    signedIn={signedIn}
    isOpen={open}
    onToggle={setOpen}
    onSelectRepo={setSelectedId}
    onOpenSource={onOpenSource}
    onCitations={onCitations}/>;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const value = useMemo(
    () => ({ open, setOpen, workspace, setWorkspace, pending, setPending }),
    [open, workspace, pending],
  );
  return <ChatContext.Provider value={value}>
    {children}
    <GlobalChat/>
  </ChatContext.Provider>;
}

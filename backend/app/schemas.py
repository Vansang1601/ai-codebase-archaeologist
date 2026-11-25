from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, HttpUrl


class RepositoryCreate(BaseModel):
    url: str
    branch: str | None = None


class SyncRequest(BaseModel):
    ref: str | None = None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=12)
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)


class ImpactRequest(BaseModel):
    target_path: str = Field(min_length=1, max_length=1000)
    depth: int = Field(default=2, ge=1, le=4)


class EvidenceOut(BaseModel):
    path: str
    line_start: int
    line_end: int
    commit_sha: str
    github_url: str | None = None
    score: float
    symbol_name: str | None = None
    repository_id: str | None = None
    tenant_id: str | None = None


class AnswerOut(BaseModel):
    answer: str
    grounded: bool
    evidence: list[EvidenceOut]
    warnings: list[str] = []

from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, Text, BigInteger, DateTime, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def uid() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_locale: Mapped[str] = mapped_column(String(8), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    auth_accounts: Mapped[list[AuthAccount]] = relationship(
        "AuthAccount", back_populates="user", cascade="all, delete-orphan"
    )
    tenant_memberships: Mapped[list[TenantMember]] = relationship(
        "TenantMember", back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list[AuthSession]] = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class AuthAccount(Base):
    __tablename__ = "auth_accounts"
    __table_args__ = (UniqueConstraint("provider", "provider_account_id", name="auth_accounts_provider_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)       # 'github' | 'google' | 'magic_link'
    provider_account_id: Mapped[str] = mapped_column(Text, nullable=False)
    access_token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship("User", back_populates="auth_accounts")

    def __repr__(self) -> str:
        return f"<AuthAccount {self.provider}:{self.provider_account_id}>"


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    owner_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    members: Mapped[list[TenantMember]] = relationship(
        "TenantMember", back_populates="tenant", cascade="all, delete-orphan"
    )
    installations: Mapped[list[GitHubInstallation]] = relationship(
        "GitHubInstallation", back_populates="tenant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tenant id={self.id} name={self.name}>"


class TenantMember(Base):
    __tablename__ = "tenant_members"

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(32), default="member")  # 'owner' | 'admin' | 'member'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="members")
    user: Mapped[User] = relationship("User", back_populates="tenant_memberships")

    def __repr__(self) -> str:
        return f"<TenantMember tenant={self.tenant_id} user={self.user_id} role={self.role}>"


class GitHubInstallation(Base):
    __tablename__ = "github_installations"
    __table_args__ = (
        UniqueConstraint("installation_id", name="uq_github_installation"),
        Index("ix_github_installations_tenant_id", "tenant_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    installation_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    github_account: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active")  # 'active' | 'suspended' | 'deleted'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="installations")

    def __repr__(self) -> str:
        return f"<GitHubInstallation installation_id={self.installation_id} tenant={self.tenant_id}>"


class AuthSession(Base):
    """Server-side session record for JWT revocation support.

    One row per issued JWT. Revoked sessions are marked with revoked_at.
    Background cleanup can delete rows where expires_at < NOW().
    """
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    jti: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship("User", back_populates="sessions")

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None and self.expires_at > now()

    def __repr__(self) -> str:
        return f"<AuthSession jti={self.jti[:8]}... user={self.user_id}>"


class AuthAuditLog(Base):
    """Immutable security audit log for all authentication events."""
    __tablename__ = "auth_audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    # Events: 'login_success' | 'login_failed' | 'logout' | 'oauth_success'
    #         'oauth_failed' | 'magic_link_sent' | 'magic_link_used'
    #         'token_revoked' | 'rate_limited' | 'session_revoked'
    provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

    def __repr__(self) -> str:
        return f"<AuthAuditLog event={self.event} user={self.user_id}>"

from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, Text, BigInteger, DateTime, ForeignKey, UniqueConstraint, Index
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

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class AuthAccount(Base):
    __tablename__ = "auth_accounts"
    __table_args__ = (UniqueConstraint("provider", "provider_account_id", name="auth_accounts_provider_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)       # 'github' | 'google'
    provider_account_id: Mapped[str] = mapped_column(Text, nullable=False)
    access_token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)   # hashed, never plaintext
    refresh_token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)  # hashed, never plaintext
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

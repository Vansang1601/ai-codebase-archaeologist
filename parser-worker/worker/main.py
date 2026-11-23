from __future__ import annotations
import logging
import time
from sqlalchemy import select
from .config import get_settings
from .database import Base, engine, SessionLocal
from .models import AnalysisJob, Repository
from .pipeline import run_job

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("archaeologist-worker")
settings = get_settings()


def claim_job(db):
    # `FOR UPDATE SKIP LOCKED` makes this safe to extend to multiple PostgreSQL workers.
    stmt = (
        select(AnalysisJob)
        .where(AnalysisJob.status == "queued")
        .order_by(AnalysisJob.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    job = db.scalar(stmt)
    if job:
        job.status = "running"
        job.phase = "claimed"
        job.progress = 1
        db.commit()
    return job


def main():
    Base.metadata.create_all(bind=engine)
    log.info("worker started")
    while True:
        db = SessionLocal()
        try:
            job = claim_job(db)
            if not job:
                db.close()
                time.sleep(settings.poll_seconds)
                continue
            log.info("processing job=%s repo=%s", job.id, job.repository_id)
            try:
                run_job(db, job)
                log.info("completed job=%s", job.id)
            except Exception as exc:
                db.rollback()
                job = db.get(AnalysisJob, job.id)
                repo = db.get(Repository, job.repository_id) if job else None
                if job:
                    job.status = "failed"
                    job.phase = "failed"
                    job.error = f"{type(exc).__name__}: {str(exc)[:500]}"
                if repo:
                    repo.status = "failed"
                db.commit()
                log.exception("job failed id=%s", getattr(job, "id", "unknown"))
        finally:
            db.close()


if __name__ == "__main__":
    main()

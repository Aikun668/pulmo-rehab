import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from core.config import settings
from database import SessionLocal
from services.ai_summary_service import AiSummaryService
from services.deepseek_client import DeepSeekClient


logger = logging.getLogger(__name__)


def run_ai_summary_job() -> None:
    db = SessionLocal()
    try:
        service = AiSummaryService(
            db=db,
            deepseek_client=DeepSeekClient(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
                model=settings.deepseek_model,
            ),
        )
        stats = service.run_weekly_job()
        logger.info(
            "AI summary job finished. total_patients=%s created=%s skipped=%s failed=%s",
            stats.total_patients,
            stats.created,
            stats.skipped,
            stats.failed,
        )
    finally:
        db.close()


def start_ai_summary_scheduler() -> BackgroundScheduler | None:
    if not settings.ai_summary_enabled:
        logger.info("AI summary scheduler is disabled.")
        return None

    scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
    scheduler.add_job(
        run_ai_summary_job,
        trigger=CronTrigger.from_crontab(settings.ai_summary_cron),
        id="ai_summary_weekly_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("AI summary scheduler started with cron=%s", settings.ai_summary_cron)
    return scheduler


def stop_ai_summary_scheduler(scheduler: BackgroundScheduler | None) -> None:
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("AI summary scheduler stopped.")

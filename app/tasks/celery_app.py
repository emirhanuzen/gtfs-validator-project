from celery import Celery
from app.config import settings

celery_app=Celery("gtfs_worker",
                broker=settings.RABBITMQ_URL,
                include=["app.tasks.gtfs_import_task"])

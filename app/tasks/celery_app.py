from celery import Celery
from app.config import RABBITMQ_URL

celery_app=Celery("gtfs_worker",
                broker=RABBITMQ_URL,
                include=["app.tasks.gtfs_import_task"])

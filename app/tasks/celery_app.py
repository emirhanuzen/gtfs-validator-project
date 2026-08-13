from celery import Celery
from app.config import settings
from kombu import Queue, Exchange

celery_app=Celery("gtfs_worker",
                broker=settings.RABBITMQ_URL,
                include=["app.tasks.gtfs_import_task"])

dead_letter_exchange = Exchange("dlx", type="direct")
dead_letter_queue = Queue("gtfs.dlq", exchange=dead_letter_exchange, routing_key="dlq")

main_queue = Queue(
    "celery",
    routing_key="celery",
    queue_arguments={
        "x-dead-letter-exchange": "dlx",
        "x-dead-letter-routing-key": "dlq"
    }
)

celery_app.conf.task_queues = (main_queue,)
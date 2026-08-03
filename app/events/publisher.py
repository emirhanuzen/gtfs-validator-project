import pika
import json
from app.config import settings

def publish_event(import_id:int,event_type:str,error_message:str=None):
        connection=pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
        channel=connection.channel()

        channel.exchange_declare(exchange="gtfs.events",exchange_type="topic")
        routing_key=f"gtfs.import.{event_type}"
        message={
            "import_id":import_id,
            "event_type":event_type,
            "error_message":error_message,
        }

        channel.basic_publish(
            exchange="gtfs.events",
            routing_key=routing_key,
            body=json.dumps(message)
        )
        connection.close()
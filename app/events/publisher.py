import pika
import json
import uuid
from datetime import datetime, timezone
from app.config import settings

def publish_event(import_id:int,event_type:str,record_counts:str,file_name=None,error_message:str=None):
        connection=pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
        channel=connection.channel()    

        channel.exchange_declare(exchange="gtfs.events",exchange_type="topic")
        routing_key=f"gtfs.import.{event_type}"
        message={
            "event_id":str(uuid.uuid4()),
            "event_type":event_type,
            "occured_at":datetime.now(timezone.utc).isoformat(),
            "import_id":import_id,
            "file_name":file_name,
            "event_type":event_type,
            "error_message":error_message,
            "records_counts":record_counts,
        }

        channel.basic_publish(
            exchange="gtfs.events",
            routing_key=routing_key,
            body=json.dumps(message)
        )
        connection.close()
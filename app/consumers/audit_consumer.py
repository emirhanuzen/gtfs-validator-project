import pika 
import json
from app.config import RABBITMQ_URL

def callback(ch,method,properties,body):
    event=json.loads(body)
    print(f"Event alındı:{event}")

def start_consumer():
    connection=pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel=connection.channel()

    channel.queue_declare(queue="gtfs.audit.queue",durable=True)

    channel.basic_consume(
        queue="gtfs.audit.queue",
        on_message_callback=callback,
        auto_ack=True
    )
    print("Audit consumer dinlenmeye başlandı")
    channel.start_consuming()

if __name__ == "__main__":
    start_consumer()


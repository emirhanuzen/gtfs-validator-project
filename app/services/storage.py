import boto3
from app.config import settings

s3_client = boto3.client(
    "s3",
    endpoint_url="http://minio:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin"
)

BUCKET_NAME = "gtfs-zips"


def ensure_bucket_exists():
    existing_buckets = [b["Name"] for b in s3_client.list_buckets()["Buckets"]]
    if BUCKET_NAME not in existing_buckets:
        s3_client.create_bucket(Bucket=BUCKET_NAME)


def upload_file_to_minio(local_file_path: str, object_key: str):
    ensure_bucket_exists()
    s3_client.upload_file(local_file_path, BUCKET_NAME, object_key)


def download_file_from_minio(object_key: str, local_file_path: str):
    s3_client.download_file(BUCKET_NAME, object_key, local_file_path)
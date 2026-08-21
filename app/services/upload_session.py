import redis
import json
import os

CHUNK_DIR = "/tmp/chunks"
redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)

SESSION_TTL_SECONDS = 30 * 60

def create_upload_session(filename: str, total_chunks: int):
    import uuid
    session_id = uuid.uuid4().hex

    session_data = {
        "filename": filename,
        "total_chunks": total_chunks,
        "received_chunks": []
    }

    redis_client.setex(
        f"upload_session:{session_id}",
        SESSION_TTL_SECONDS,
        json.dumps(session_data)
    )

    return session_id

def get_session(session_id: str) :
    data = redis_client.get(f"upload_session:{session_id}")
    if not data:
        return None
    return json.loads(data)


def save_chunk(session_id: str, chunk_number: int, chunk_data: bytes):
    session = get_session(session_id)
    if not session:
        raise ValueError("Upload session bulunamadı ya da süresi dolmuş")

    os.makedirs(CHUNK_DIR, exist_ok=True)
    chunk_file_path = os.path.join(CHUNK_DIR, f"{session_id}_part_{chunk_number}")

    with open(chunk_file_path, "wb") as f:
        f.write(chunk_data)

    if chunk_number not in session["received_chunks"]:
        session["received_chunks"].append(chunk_number)

    redis_client.setex(
        f"upload_session:{session_id}",
        SESSION_TTL_SECONDS,
        json.dumps(session)
    )

    return session
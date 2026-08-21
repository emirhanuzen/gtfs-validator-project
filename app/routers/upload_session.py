from app.services.upload_session import create_upload_session
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi import UploadFile, File
from app.services.upload_session import save_chunk
from app.services.upload_session import get_session
from app.services.import_gtfs import calculate_checksum
from app.services import import_gtfs
from app.services.storage import upload_file_to_minio
from app.tasks.gtfs_import_task import process_gtfs_import
import os
from app.services.upload_session import redis_client
from app.dependencies import get_db
from sqlalchemy.orm import Session

router=APIRouter(prefix="/import_gtfs",tags=["upload_session"])

@router.post("/uploads/init")
def init_upload(filename: str, total_chunks: int):
    session_id = create_upload_session(filename, total_chunks)
    return {"session_id": session_id}

@router.post("/uploads/{session_id}/chunk/{chunk_number}")
async def upload_chunk(session_id: str, chunk_number: int, file: UploadFile = File(...)):
    chunk_data = await file.read()
    session = save_chunk(session_id, chunk_number, chunk_data)
    return {"received_chunks": session["received_chunks"], "total_chunks": session["total_chunks"]}


@router.get("/uploads/{session_id}/status")
def upload_status(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session bulunamadı ya da süresi doldu")
    return session

@router.post("/uploads/{session_id}/complete")
async def complete_upload(session_id: str, db:Session = Depends(get_db)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session bulunamadı")
    if len(session["received_chunks"]) != session["total_chunks"]:
        raise HTTPException(status_code=400, detail="Eksik parçalar var, tamamlanamaz")

    final_path = f"/tmp/{session_id}_{session['filename']}"
    with open(final_path, "wb") as final_file:
        for i in range(1, session["total_chunks"] + 1):
            part_path = f"/tmp/chunks/{session_id}_part_{i}"
            with open(part_path, "rb") as part_file:
                final_file.write(part_file.read())
            os.remove(part_path)

    checksum = calculate_checksum(final_path)
    unique_name = f"{session_id}_{session['filename']}"
    upload_file_to_minio(final_path, unique_name)
    os.remove(final_path)

    db_import = import_gtfs.create_import(db, session["filename"], unique_name, checksum)
    task = process_gtfs_import.delay(db_import.id)
    db_import.celery_task_id = task.id
    db.commit()

    redis_client.delete(f"upload_session:{session_id}")
    return db_import
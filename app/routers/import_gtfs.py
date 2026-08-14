import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.import_gtfs import ImportResponse
from app.services import import_gtfs
from app.config import settings
from app.tasks.gtfs_import_task import process_gtfs_import 
import uuid
from fastapi.responses import StreamingResponse
from app.services.storage import upload_file_to_minio
from app.services.import_gtfs import calculate_checksum

router=APIRouter(prefix="/import_gtfs",tags=["import_gtfs"])

@router.post("/", response_model=ImportResponse)
async def create_import(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Sadece .zip dosyası kabul edilmektedir")

    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    local_temp_path = os.path.join("/tmp", unique_name)
    with open(local_temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    checksum = calculate_checksum(local_temp_path)   # diskteyken hesaplama

    upload_file_to_minio(local_temp_path, unique_name)
    os.remove(local_temp_path)

    db_import = import_gtfs.create_import(db, file.filename, unique_name, checksum)
    
    task = process_gtfs_import.delay(db_import.id)
    db_import.celery_task_id = task.id
    db.commit()
    return db_import
    
@router.get("/{file_id}",response_model=ImportResponse)
def get_import(file_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_import(file_id,db)

@router.get("/",response_model=list[ImportResponse])
def get_import(db:Session=Depends(get_db)):
    return import_gtfs.get_import_all(db)

@router.get("/{import_id}/stream")
def stream_import_status(import_id:int):
    return StreamingResponse(
        import_gtfs.event_stream(import_id),
        media_type="text/event-stream"
    )

@router.post("/{import_id}/retry", response_model=ImportResponse)
def retry_import(import_id: int, db: Session = Depends(get_db)):
    db_import = import_gtfs.retry_import(import_id, db)
    process_gtfs_import.delay(db_import.id)
    return db_import

@router.post("/{import_id}/cancel", response_model=ImportResponse)
def cancel_import(import_id: int, db: Session = Depends(get_db)):
    return import_gtfs.cancel_import(import_id, db)